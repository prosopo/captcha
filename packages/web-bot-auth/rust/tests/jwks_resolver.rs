// Copyright 2021-2026 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Ported from src/tests/jwksResolver.test.ts

use std::sync::Arc;

use super::support::{FakeClock, MockFetch};
use crate::jwks_resolver::{
    JwksFetch, JwksResolver, JwksResolverOptions, JwksResponse, MAX_CACHE_ENTRIES,
};

const JWKS_BODY: &str = r#"{"keys":[{"kty":"OKP","crv":"Ed25519","kid":"k","x":"AAAA"}]}"#;

fn ok_fetch() -> Arc<MockFetch> {
    MockFetch::ok(JWKS_BODY.to_string(), Vec::new())
}

fn options(fetch: Arc<MockFetch>) -> JwksResolverOptions {
    JwksResolverOptions {
        fetch: Some(fetch as Arc<dyn JwksFetch>),
        ..JwksResolverOptions::default()
    }
}

#[tokio::test]
async fn fetches_the_directory_of_an_https_signer() {
    let resolver: JwksResolver = JwksResolver::new();
    let fetch: Arc<MockFetch> = ok_fetch();
    let keys = resolver
        .resolve_jwks_from_signature_agent(
            "https://signer.example.com",
            &options(Arc::clone(&fetch)),
        )
        .await
        .expect("keys");
    assert_eq!(keys.len(), 1);
    assert_eq!(
        fetch.seen_urls(),
        vec!["https://signer.example.com/.well-known/http-message-signatures-directory"]
    );
}

// The signer URL comes straight from a request header, so it must not be
// usable to make the provider issue requests into its own network.
async fn assert_refused(signer_url: &str) {
    let resolver: JwksResolver = JwksResolver::new();
    let fetch: Arc<MockFetch> = ok_fetch();
    let result = resolver
        .resolve_jwks_from_signature_agent(signer_url, &options(Arc::clone(&fetch)))
        .await;
    assert!(result.is_err(), "{signer_url} should be refused");
    assert_eq!(fetch.call_count(), 0, "{signer_url} should not be fetched");
}

macro_rules! refuses_to_fetch_from {
    ($($name:ident: $url:expr,)*) => {$(
        #[tokio::test]
        async fn $name() {
            assert_refused($url).await;
        }
    )*};
}

refuses_to_fetch_from! {
    refuses_to_fetch_from_http_signer: "http://signer.example.com",
    refuses_to_fetch_from_loopback_ipv4: "https://127.0.0.1",
    refuses_to_fetch_from_private_ipv4_with_port: "https://10.0.0.5:6379",
    refuses_to_fetch_from_link_local_metadata: "https://169.254.169.254",
    refuses_to_fetch_from_loopback_ipv6: "https://[::1]",
    refuses_to_fetch_from_localhost: "https://localhost",
    refuses_to_fetch_from_localhost_subdomain: "https://redis.localhost",
}

#[tokio::test]
async fn allows_a_local_http_signer_only_when_asked_to() {
    let resolver: JwksResolver = JwksResolver::new();
    let keys = resolver
        .resolve_jwks_from_signature_agent(
            "http://localhost:1234",
            &JwksResolverOptions {
                allow_local_signers: true,
                ..options(ok_fetch())
            },
        )
        .await
        .expect("keys");
    assert_eq!(keys.len(), 1);
}

#[tokio::test]
async fn gives_up_on_a_directory_that_never_answers() {
    let resolver: JwksResolver = JwksResolver::new();
    let hang: Arc<MockFetch> = MockFetch::new(|_url: &str| Box::pin(std::future::pending()));
    let result = resolver
        .resolve_jwks_from_signature_agent(
            "https://slow.example.com",
            &JwksResolverOptions {
                timeout_ms: Some(20),
                ..options(hang)
            },
        )
        .await;
    assert!(result.is_err());
}

#[tokio::test]
async fn refuses_an_oversized_directory_body() {
    let resolver: JwksResolver = JwksResolver::new();
    let huge: String = format!(r#"{{"keys":[],"pad":"{}"}}"#, "x".repeat(200_000));
    let fetch: Arc<MockFetch> = MockFetch::new(move |_url: &str| {
        let response: JwksResponse =
            JwksResponse::from_bytes(200, Vec::new(), huge.clone().into_bytes());
        Box::pin(async move { Ok(response) })
    });
    let result = resolver
        .resolve_jwks_from_signature_agent("https://big.example.com", &options(fetch))
        .await;
    assert!(result.is_err());
}

#[tokio::test]
async fn keeps_the_cache_bounded_when_every_request_names_a_new_signer() {
    let resolver: JwksResolver = JwksResolver::new();
    let opts: JwksResolverOptions = options(ok_fetch());
    for i in 0..1500 {
        resolver
            .resolve_jwks_from_signature_agent(&format!("https://s{i}.example.com"), &opts)
            .await
            .expect("keys");
    }
    assert!(resolver.jwks_cache_size() <= MAX_CACHE_ENTRIES);
}

#[tokio::test]
async fn caps_a_signer_supplied_max_age_at_24_hours() {
    let clock: FakeClock = FakeClock::new(1_767_225_600_000.0);
    let resolver: JwksResolver = clock.resolver();
    let fetch: Arc<MockFetch> = MockFetch::ok(
        JWKS_BODY.to_string(),
        vec![("cache-control".to_string(), "max-age=999999999".to_string())],
    );
    let opts: JwksResolverOptions = options(Arc::clone(&fetch));
    resolver
        .resolve_jwks_from_signature_agent("https://s.example.com", &opts)
        .await
        .expect("keys");
    clock.set(1_767_312_001_000.0);
    resolver
        .resolve_jwks_from_signature_agent("https://s.example.com", &opts)
        .await
        .expect("keys");
    assert_eq!(fetch.call_count(), 2);
}
