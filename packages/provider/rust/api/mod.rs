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

//! The provider's HTTP API (startProviderApi.ts), route by route as MIGRATION.md §3 phases them.

pub mod admin;
pub mod assets;
pub mod block;
pub mod body_summary;
pub mod body;
pub mod captcha;
pub mod challenge;
pub mod domain;
pub mod express;
pub mod healthz_geo;
pub mod maintenance;
pub mod metrics;
pub mod padding;
pub mod pipeline;
pub mod public;
pub mod verify;
pub mod query;
pub mod rules;
pub mod signals;
pub mod solution;

use axum::middleware::from_fn;
use axum::Router;
use public::{public_routes, PublicState};
use std::sync::Arc;

/// The app: Node's `Host` check, express's `X-Powered-By`, CORS, the JSON body, the public
/// routes, then the state's `rest` (the pipeline after the public router).
pub fn provider_app(public: Arc<PublicState>) -> Router {
    Router::new()
        .fallback(public_routes)
        .with_state(public)
        .layer(from_fn(body::json_body))
        .layer(from_fn(express::cors))
        .layer(from_fn(express::powered_by))
        .layer(from_fn(express::require_host))
}

/// A `rest` that answers everything with express's 404, for the public router on its own.
pub fn not_found_only() -> Router {
    Router::new().fallback(|request: axum::extract::Request| async move { express::not_found(&request) })
}

/// `adminAuthOptions(process.env, host)`: the audiences an admin token may name, whether it
/// must name one, its longest lifetime, and single use for tokens with a `jti`.
pub fn admin_auth_options(env: &dyn Fn(&str) -> Option<String>, host: Option<&str>) -> prosopo_api_router::AuthMiddlewareOptions {
    let list = |value: Option<String>| -> Vec<String> {
        value.unwrap_or_default().split(',').map(str::trim).filter(|entry| !entry.is_empty()).map(str::to_string).collect()
    };
    let configured: Vec<String> = list(env("PROSOPO_ADMIN_JWT_AUDIENCE"));
    let require_audience: bool = env("PROSOPO_ADMIN_JWT_REQUIRE_AUDIENCE").as_deref() == Some("true");
    let derived: Vec<String> = host.filter(|host| !host.is_empty()).map(|host| vec![host.to_string(), format!("https://{host}")]).unwrap_or_default();
    let candidates: Vec<String> = if configured.is_empty() { derived } else { configured };
    let audience: Option<Vec<String>> = (!candidates.is_empty() || require_audience).then_some(candidates);
    let max_lifetime: f64 = prosopo_util::parse_int(&env("PROSOPO_ADMIN_JWT_MAX_LIFETIME_SECONDS").unwrap_or_default(), 10);
    prosopo_api_router::AuthMiddlewareOptions {
        verify: prosopo_util_crypto::jwt::JwtVerifyOptions {
            audience,
            require_audience,
            max_lifetime_seconds: Some(if max_lifetime.is_finite() && max_lifetime > 0.0 { max_lifetime } else { 3600.0 }),
        },
        replay_guard: Some(std::sync::Arc::new(prosopo_api_router::MemoryJwtReplayGuard::new(None, None))),
    }
}

#[cfg(test)]
mod tests {
    use super::admin_auth_options;
    use std::collections::HashMap;

    fn options(pairs: &[(&str, &str)], host: Option<&str>) -> prosopo_util_crypto::jwt::JwtVerifyOptions {
        let variables: HashMap<String, String> = pairs.iter().map(|(name, value)| (name.to_string(), value.to_string())).collect();
        admin_auth_options(&|name: &str| variables.get(name).cloned(), host).verify
    }

    #[test]
    fn binds_tokens_to_the_provider_host_by_default_without_requiring_aud() {
        let verify = options(&[], Some("pronode1.prosopo.io"));
        assert_eq!(verify.audience, Some(vec!["pronode1.prosopo.io".to_string(), "https://pronode1.prosopo.io".to_string()]));
        assert!(!verify.require_audience);
        assert_eq!(verify.max_lifetime_seconds, Some(3600.0));
    }

    #[test]
    fn uses_the_configured_audience_list_over_the_host() {
        let verify = options(
            &[
                ("PROSOPO_ADMIN_JWT_AUDIENCE", " https://a.example , b.example ,"),
                ("PROSOPO_ADMIN_JWT_REQUIRE_AUDIENCE", "true"),
                ("PROSOPO_ADMIN_JWT_MAX_LIFETIME_SECONDS", "600"),
            ],
            Some("pronode1.prosopo.io"),
        );
        assert_eq!(verify.audience, Some(vec!["https://a.example".to_string(), "b.example".to_string()]));
        assert!(verify.require_audience);
        assert_eq!(verify.max_lifetime_seconds, Some(600.0));
    }

    #[test]
    fn skips_the_audience_check_when_there_is_nothing_to_bind_to() {
        assert_eq!(options(&[], Some("")).audience, None);
    }

    #[test]
    fn fails_closed_when_an_audience_is_required_but_none_is_known() {
        let verify = options(&[("PROSOPO_ADMIN_JWT_REQUIRE_AUDIENCE", "true")], None);
        assert_eq!(verify.audience, Some(Vec::new()));
        assert!(verify.require_audience);
    }

    #[test]
    fn ignores_an_unusable_max_lifetime() {
        assert_eq!(options(&[("PROSOPO_ADMIN_JWT_MAX_LIFETIME_SECONDS", "abc")], Some("h")).max_lifetime_seconds, Some(3600.0));
    }
}
