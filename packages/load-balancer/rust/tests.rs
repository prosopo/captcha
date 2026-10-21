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

//! Ports of the server-side cases in src/tests/*.unit.test.ts, one test each. Not ported,
//! because the code they cover stays TS in the widget: retry.unit.test.ts, the
//! `getRandomActiveProvider` and `getRandomProviderFromList` cases in providers.unit.test.ts,
//! and the `getRandomProviderFromList` cases in productionProviderList.unit.test.ts.

use crate::*;
use prosopo_types::config::EnvironmentTypes;
use prosopo_util_crypto::json_parse;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Duration;

/// Tests that read or write the process environment take this first.
static ENV_LOCK: Mutex<()> = Mutex::new(());

fn provider(address: &str, url: &str, weight: u32) -> HardcodedProvider {
    HardcodedProvider {
        address: address.to_string(),
        url: url.to_string(),
        dataset_id: "0x0".to_string(),
        weight,
    }
}

fn urls(providers: &[HardcodedProvider]) -> Vec<&str> {
    providers
        .iter()
        .map(|provider| provider.url.as_str())
        .collect()
}

fn env_with(variables: &[(&str, &str)]) -> EnvLookup {
    let variables: HashMap<String, String> = variables
        .iter()
        .map(|(name, value)| (name.to_string(), value.to_string()))
        .collect();
    Arc::new(move |name: &str| variables.get(name).cloned())
}

struct CountingFetch {
    body: Option<String>,
    requests: Arc<Mutex<Vec<String>>>,
}

impl ProviderListFetch for CountingFetch {
    fn get(&self, url: &str) -> FetchFuture {
        self.requests
            .lock()
            .expect("requests lock")
            .push(url.to_string());
        let body: Option<String> = self.body.clone();
        Box::pin(async move {
            match body {
                Some(body) => Ok(body.into_bytes()),
                None => std::future::pending().await,
            }
        })
    }
}

/// A balancer whose list fetch answers `body`, or stalls when there is none.
fn balancer(body: Option<&str>, env: EnvLookup) -> (LoadBalancer, Arc<Mutex<Vec<String>>>) {
    let requests: Arc<Mutex<Vec<String>>> = Arc::new(Mutex::new(Vec::new()));
    let fetch = CountingFetch {
        body: body.map(str::to_string),
        requests: requests.clone(),
    };
    (LoadBalancer::with(Arc::new(fetch), env), requests)
}

mod provider_list_override {
    use super::*;

    fn provider_list_json() -> String {
        json!({
            "one": { "address": "5Provider1", "url": "https://one.example.com/", "datasetId": "0xabc", "weight": 3 },
            "two": { "address": "5Provider2", "url": "https://two.example.com", "datasetId": "0xdef" },
        })
        .to_string()
    }

    fn self_hosted(url: &str) -> HardcodedProvider {
        HardcodedProvider {
            address: "self-hosted".to_string(),
            url: url.to_string(),
            dataset_id: String::new(),
            weight: 1,
        }
    }

    #[test]
    fn reading_returns_undefined_when_unset() {
        let _guard = ENV_LOCK
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        std::env::remove_var(PROVIDER_LIST_ENV);
        assert_eq!(read_provider_list_override(), None);
    }

    #[test]
    fn reading_returns_the_raw_value_when_set() {
        let _guard = ENV_LOCK
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        std::env::set_var(PROVIDER_LIST_ENV, "https://captcha.example.com");
        let value: Option<String> = read_provider_list_override();
        std::env::remove_var(PROVIDER_LIST_ENV);
        assert_eq!(value.as_deref(), Some("https://captcha.example.com"));
    }

    #[test]
    fn is_empty_when_unset_or_blank_so_normal_discovery_is_untouched() {
        for raw in [None, Some(""), Some("   ")] {
            assert!(get_provider_list_override(raw, None).is_empty(), "{raw:?}");
        }
    }

    #[test]
    fn accepts_a_single_bare_url() {
        assert_eq!(
            get_provider_list_override(Some("https://captcha.example.com"), None),
            vec![self_hosted("https://captcha.example.com")]
        );
    }

    #[test]
    fn accepts_several_comma_separated_urls() {
        let providers = get_provider_list_override(
            Some("https://one.example.com, https://two.example.com"),
            None,
        );
        assert_eq!(
            urls(&providers),
            ["https://one.example.com", "https://two.example.com"]
        );
    }

    #[test]
    fn strips_trailing_slashes_from_both_forms() {
        let bare = get_provider_list_override(Some("https://captcha.example.com/"), None);
        assert_eq!(urls(&bare), ["https://captcha.example.com"]);
        let from_json = get_provider_list_override(Some(&provider_list_json()), None);
        assert_eq!(
            urls(&from_json),
            ["https://one.example.com", "https://two.example.com"]
        );
    }

    #[test]
    fn accepts_the_hosted_provider_list_json_preserving_address_and_weight() {
        let providers = get_provider_list_override(Some(&provider_list_json()), None);
        assert_eq!(
            providers,
            vec![
                HardcodedProvider {
                    address: "5Provider1".to_string(),
                    url: "https://one.example.com".to_string(),
                    dataset_id: "0xabc".to_string(),
                    weight: 3,
                },
                HardcodedProvider {
                    address: "5Provider2".to_string(),
                    url: "https://two.example.com".to_string(),
                    dataset_id: "0xdef".to_string(),
                    weight: 1,
                },
            ]
        );
    }

    #[test]
    fn reads_the_ipv4_and_ipv6_sub_lists_when_the_json_carries_them() {
        let raw: String = json!({
            "dual": { "address": "5Dual", "url": "https://dual.example.com", "datasetId": "0x1" },
            "ipv4": { "four": { "address": "5Four", "url": "https://v4.example.com", "datasetId": "0x2" } },
        })
        .to_string();
        assert_eq!(
            urls(&get_provider_list_override(Some(&raw), Some(IpMode::Ipv4))),
            ["https://v4.example.com"]
        );
        assert_eq!(
            urls(&get_provider_list_override(Some(&raw), None)),
            ["https://dual.example.com"]
        );
    }

    #[test]
    fn falls_back_to_normal_discovery_rather_than_throwing_on_malformed_json() {
        assert!(get_provider_list_override(Some("{not json"), None).is_empty());
        assert!(get_provider_list_override(
            Some(r#"{"one":{"url":"missing-other-fields"}}"#),
            None
        )
        .is_empty());
    }

    #[tokio::test]
    async fn load_balancer_returns_the_override_without_fetching_the_hosted_list() {
        let (balancer, requests) = balancer(
            None,
            env_with(&[(PROVIDER_LIST_ENV, "https://captcha.example.com/")]),
        );
        let providers = balancer
            .providers(
                EnvironmentTypes::Production,
                None,
                PROVIDER_LIST_FETCH_TIMEOUT_MS,
            )
            .await
            .expect("providers");
        assert_eq!(providers, vec![self_hosted("https://captcha.example.com")]);
        assert!(requests.lock().expect("lock").is_empty());
    }

    #[tokio::test]
    async fn load_balancer_applies_the_override_in_every_environment_not_just_development() {
        let (balancer, _) = balancer(
            None,
            env_with(&[(PROVIDER_LIST_ENV, "https://captcha.example.com")]),
        );
        for environment in EnvironmentTypes::ALL {
            let providers = balancer
                .providers(environment, None, PROVIDER_LIST_FETCH_TIMEOUT_MS)
                .await
                .expect("providers");
            assert_eq!(
                urls(&providers),
                ["https://captcha.example.com"],
                "{environment}"
            );
        }
    }

    #[tokio::test]
    async fn load_balancer_does_not_prefix_ipv4_or_ipv6_labels_onto_a_bare_url_override() {
        let (balancer, _) = balancer(
            None,
            env_with(&[(PROVIDER_LIST_ENV, "https://captcha.example.com")]),
        );
        let providers = balancer
            .providers(
                EnvironmentTypes::Production,
                Some(IpMode::Ipv4),
                PROVIDER_LIST_FETCH_TIMEOUT_MS,
            )
            .await
            .expect("providers");
        assert_eq!(urls(&providers), ["https://captcha.example.com"]);
    }
}

mod production_provider_list {
    use super::*;

    fn entry(host: &str) -> Value {
        json!({
            "url": format!("https://{host}.prosopo.io"),
            "datasetId": "0x2e52a1e70f0e0c808972bc04e6fbc8f264b1fbb29c94041fdf01a839b000a40e",
            "address": "5FnBurrfqWgSLJFMsojjEP74mLX1vZZ9ASyNXKfA5YXu8FR2",
        })
    }

    fn production_json() -> String {
        json!({
            "ipv4": { "pronode6": entry("ipv4.pronode6"), "pronode7": entry("ipv4.pronode7"), "pronode16": entry("ipv4.pronode16") },
            "ipv6": { "pronode6": entry("ipv6.pronode6"), "pronode7": entry("ipv6.pronode7"), "pronode16": entry("ipv6.pronode16") },
            "pronode6": entry("pronode6"),
            "pronode7": entry("pronode7"),
            "pronode16": entry("pronode16"),
        })
        .to_string()
    }

    fn convert(ip_mode: Option<IpMode>) -> Vec<HardcodedProvider> {
        convert_hosted_provider(&json_parse(&production_json()).expect("json"), ip_mode)
            .expect("providers")
    }

    #[test]
    fn keeps_only_the_dual_stack_pronodes_and_drops_the_ipv4_and_ipv6_sub_lists() {
        let providers = convert(None);
        assert_eq!(
            urls(&providers),
            [
                "https://pronode16.prosopo.io",
                "https://pronode6.prosopo.io",
                "https://pronode7.prosopo.io"
            ]
        );
        for provider in &providers {
            assert_eq!(provider.weight, 1);
            assert_eq!(
                provider.dataset_id,
                "0x2e52a1e70f0e0c808972bc04e6fbc8f264b1fbb29c94041fdf01a839b000a40e"
            );
            assert_eq!(
                provider.address,
                "5FnBurrfqWgSLJFMsojjEP74mLX1vZZ9ASyNXKfA5YXu8FR2"
            );
            assert!(!provider.url.contains("ipv4.") && !provider.url.contains("ipv6."));
        }
    }

    #[test]
    fn returns_the_ipv4_single_stack_sub_list_when_ip_mode_is_ipv4() {
        let providers = convert(Some(IpMode::Ipv4));
        assert_eq!(
            urls(&providers),
            [
                "https://ipv4.pronode16.prosopo.io",
                "https://ipv4.pronode6.prosopo.io",
                "https://ipv4.pronode7.prosopo.io"
            ]
        );
        let hostnames: Vec<String> = providers
            .iter()
            .map(|provider| get_provider_hostname(provider).expect("hostname"))
            .collect();
        assert_eq!(
            hostnames,
            [
                "pronode16.prosopo.io",
                "pronode6.prosopo.io",
                "pronode7.prosopo.io"
            ]
        );
    }

    #[test]
    fn returns_the_ipv6_single_stack_sub_list_when_ip_mode_is_ipv6() {
        assert_eq!(
            urls(&convert(Some(IpMode::Ipv6))),
            [
                "https://ipv6.pronode16.prosopo.io",
                "https://ipv6.pronode6.prosopo.io",
                "https://ipv6.pronode7.prosopo.io"
            ]
        );
    }

    #[tokio::test]
    async fn load_balancer_fetches_the_production_list_and_returns_the_dual_stack_pronodes() {
        let body: String = production_json();
        let (balancer, requests) = balancer(Some(&body), env_with(&[]));
        let providers = balancer
            .providers(
                EnvironmentTypes::Production,
                None,
                PROVIDER_LIST_FETCH_TIMEOUT_MS,
            )
            .await
            .expect("providers");
        assert_eq!(
            *requests.lock().expect("lock"),
            ["https://provider-list.prosopo.io/"]
        );
        assert_eq!(
            urls(&providers),
            [
                "https://pronode16.prosopo.io",
                "https://pronode6.prosopo.io",
                "https://pronode7.prosopo.io"
            ]
        );
    }

    #[tokio::test]
    async fn aborts_a_stalled_provider_list_fetch_after_the_timeout() {
        let (balancer, _) = balancer(None, env_with(&[]));
        let started = std::time::Instant::now();
        let result = balancer
            .providers(EnvironmentTypes::Production, None, 50)
            .await;
        assert_eq!(result, Err(LoadBalancerError::TimedOut));
        assert!(started.elapsed() < Duration::from_secs(2));
    }

    #[tokio::test(start_paused = true)]
    async fn bounds_the_fetch_by_default() {
        assert_eq!(PROVIDER_LIST_FETCH_TIMEOUT_MS, 10_000);
        let (balancer, _) = balancer(None, env_with(&[]));
        let started = tokio::time::Instant::now();
        let result = LoadProviders::load(&balancer, EnvironmentTypes::Production, None).await;
        assert_eq!(result, Err(LoadBalancerError::TimedOut));
        assert_eq!(
            started.elapsed(),
            Duration::from_millis(PROVIDER_LIST_FETCH_TIMEOUT_MS)
        );
    }
}

/// A `loadBalancer` stand-in that answers from a queue and records each call.
struct QueuedLoader {
    answers: Mutex<Vec<Result<Vec<HardcodedProvider>>>>,
    by_mode: Option<HashMap<Option<IpMode>, Vec<HardcodedProvider>>>,
    calls: Mutex<Vec<(EnvironmentTypes, Option<IpMode>)>>,
}

impl QueuedLoader {
    fn answering(answers: Vec<Result<Vec<HardcodedProvider>>>) -> Arc<QueuedLoader> {
        Arc::new(QueuedLoader {
            answers: Mutex::new(answers),
            by_mode: None,
            calls: Mutex::new(Vec::new()),
        })
    }

    fn by_mode(lists: Vec<(Option<IpMode>, Vec<HardcodedProvider>)>) -> Arc<QueuedLoader> {
        Arc::new(QueuedLoader {
            answers: Mutex::new(Vec::new()),
            by_mode: Some(lists.into_iter().collect()),
            calls: Mutex::new(Vec::new()),
        })
    }

    fn calls(&self) -> Vec<(EnvironmentTypes, Option<IpMode>)> {
        self.calls.lock().expect("calls lock").clone()
    }
}

impl LoadProviders for QueuedLoader {
    fn load(&self, environment: EnvironmentTypes, ip_mode: Option<IpMode>) -> LoadFuture {
        self.calls
            .lock()
            .expect("calls lock")
            .push((environment, ip_mode));
        let answer: Result<Vec<HardcodedProvider>> = match &self.by_mode {
            Some(lists) => Ok(lists.get(&ip_mode).cloned().unwrap_or_default()),
            None => {
                let mut answers = self.answers.lock().expect("answers lock");
                if answers.len() > 1 {
                    answers.remove(0)
                } else {
                    answers[0].clone()
                }
            }
        };
        Box::pin(async move { answer })
    }
}

/// A clock the test moves by hand.
fn clock() -> (Clock, Arc<Mutex<f64>>) {
    let now: Arc<Mutex<f64>> = Arc::new(Mutex::new(1_700_000_000_000.0));
    let reading: Arc<Mutex<f64>> = now.clone();
    (Arc::new(move || *reading.lock().expect("clock lock")), now)
}

fn advance(now: &Arc<Mutex<f64>>, ms: f64) {
    *now.lock().expect("clock lock") += ms;
}

fn directory(loader: Arc<QueuedLoader>) -> (ProviderDirectory, Arc<Mutex<f64>>) {
    let (clock, now) = clock();
    (ProviderDirectory::with_clock(loader, clock), now)
}

mod get_providers {
    use super::*;

    fn one() -> Vec<HardcodedProvider> {
        vec![provider("5xyz", "https://p1", 1)]
    }

    #[tokio::test]
    async fn loads_the_provider_list_once_and_serves_repeat_callers_from_cache() {
        let loader = QueuedLoader::answering(vec![Ok(one())]);
        let (directory, _) = directory(loader.clone());
        let first = directory
            .get_providers(EnvironmentTypes::Production, None)
            .await
            .expect("first");
        let second = directory
            .get_providers(EnvironmentTypes::Production, None)
            .await
            .expect("second");
        assert_eq!(&*first, one().as_slice());
        assert!(Arc::ptr_eq(&first, &second));
        assert_eq!(loader.calls().len(), 1);
    }

    #[tokio::test]
    async fn dedupes_concurrent_in_flight_loads_into_a_single_call() {
        let loader = QueuedLoader::answering(vec![Ok(one())]);
        let (directory, _) = directory(loader.clone());
        let (a, b) = tokio::join!(
            directory.get_providers(EnvironmentTypes::Production, None),
            directory.get_providers(EnvironmentTypes::Production, None)
        );
        assert!(Arc::ptr_eq(&a.expect("a"), &b.expect("b")));
        assert_eq!(loader.calls().len(), 1);
    }

    #[tokio::test]
    async fn does_not_cache_failures_so_a_rejected_load_is_retried_on_the_next_call() {
        let loader = QueuedLoader::answering(vec![
            Err(LoadBalancerError::Message("transient".to_string())),
            Ok(one()),
        ]);
        let (directory, _) = directory(loader.clone());
        let failed = directory
            .get_providers(EnvironmentTypes::Production, None)
            .await;
        assert_eq!(failed.expect_err("fails").to_string(), "transient");
        let retried = directory
            .get_providers(EnvironmentTypes::Production, None)
            .await
            .expect("retries");
        assert_eq!(&*retried, one().as_slice());
        assert_eq!(loader.calls().len(), 2);
    }

    #[tokio::test]
    async fn keeps_a_separate_entry_per_ip_mode_and_passes_it_to_load_balancer() {
        let dual = vec![provider("5xyz", "https://p1", 1)];
        let v4 = vec![provider("5xyz", "https://ipv4.p1", 1)];
        let loader =
            QueuedLoader::by_mode(vec![(None, dual.clone()), (Some(IpMode::Ipv4), v4.clone())]);
        let (directory, _) = directory(loader.clone());
        for _ in 0..2 {
            assert_eq!(
                &*directory
                    .get_providers(EnvironmentTypes::Production, None)
                    .await
                    .expect("dual"),
                dual.as_slice()
            );
            assert_eq!(
                &*directory
                    .get_providers(EnvironmentTypes::Production, Some(IpMode::Ipv4))
                    .await
                    .expect("v4"),
                v4.as_slice()
            );
        }
        assert_eq!(
            loader.calls(),
            [
                (EnvironmentTypes::Production, None),
                (EnvironmentTypes::Production, Some(IpMode::Ipv4))
            ]
        );
    }

    #[tokio::test]
    async fn reloads_once_the_cached_list_is_older_than_the_ttl() {
        let first = vec![provider("5A", "https://p1", 1)];
        let second = vec![provider("5B", "https://p2", 1)];
        let loader = QueuedLoader::answering(vec![Ok(first.clone()), Ok(second.clone())]);
        let (directory, now) = directory(loader.clone());
        assert_eq!(
            &*directory
                .get_providers(EnvironmentTypes::Production, None)
                .await
                .expect("first"),
            first.as_slice()
        );
        advance(&now, PROVIDER_LIST_TTL_MS - 1.0);
        assert_eq!(
            &*directory
                .get_providers(EnvironmentTypes::Production, None)
                .await
                .expect("cached"),
            first.as_slice()
        );
        advance(&now, 1.0);
        assert_eq!(
            &*directory
                .get_providers(EnvironmentTypes::Production, None)
                .await
                .expect("reloaded"),
            second.as_slice()
        );
        assert_eq!(loader.calls().len(), 2);
    }
}

mod find_provider {
    use super::*;

    fn providers() -> Vec<HardcodedProvider> {
        vec![
            provider("5A", "https://pronode1.io", 1),
            provider("5B", "https://pronode2.io", 1),
        ]
    }

    async fn address_of(
        directory: &ProviderDirectory,
        url: Option<&str>,
        ip_mode: Option<IpMode>,
    ) -> Option<String> {
        directory
            .find_provider(EnvironmentTypes::Production, url, ip_mode)
            .await
            .expect("lookup")
            .map(|provider| provider.address)
    }

    #[tokio::test]
    async fn matches_the_issuing_provider_by_exact_url() {
        let loader = QueuedLoader::answering(vec![Ok(providers())]);
        let (directory, _) = directory(loader.clone());
        assert_eq!(
            address_of(&directory, Some("https://pronode2.io"), None)
                .await
                .as_deref(),
            Some("5B")
        );
        assert_eq!(loader.calls().len(), 1);
    }

    #[tokio::test]
    async fn serves_a_hit_from_cache_without_reloading_the_list() {
        let loader = QueuedLoader::answering(vec![Ok(providers())]);
        let (directory, _) = directory(loader.clone());
        for _ in 0..3 {
            address_of(&directory, Some("https://pronode1.io"), None).await;
        }
        assert_eq!(loader.calls().len(), 1);
    }

    #[tokio::test]
    async fn looks_in_the_ip_mode_section_the_token_was_minted_against() {
        let v4 = vec![provider("5A", "https://ipv4.pronode1.io", 1)];
        let loader = QueuedLoader::by_mode(vec![(None, providers()), (Some(IpMode::Ipv4), v4)]);
        let (directory, _) = directory(loader);
        assert_eq!(
            address_of(
                &directory,
                Some("https://ipv4.pronode1.io"),
                Some(IpMode::Ipv4)
            )
            .await
            .as_deref(),
            Some("5A")
        );
    }

    #[tokio::test]
    async fn reloads_on_a_miss_so_a_provider_added_mid_ttl_still_verifies() {
        let mut added = providers();
        added.push(provider("5C", "https://pronode3.io", 1));
        let loader = QueuedLoader::answering(vec![Ok(providers()), Ok(added)]);
        let (directory, now) = directory(loader.clone());
        address_of(&directory, Some("https://pronode1.io"), None).await;
        advance(&now, PROVIDER_LIST_MISS_RELOAD_MS);
        assert_eq!(
            address_of(&directory, Some("https://pronode3.io"), None)
                .await
                .as_deref(),
            Some("5C")
        );
        assert_eq!(loader.calls().len(), 2);
    }

    #[tokio::test]
    async fn rate_limits_the_reload_so_an_unknown_url_cannot_refetch_per_request() {
        let loader = QueuedLoader::answering(vec![Ok(providers())]);
        let (directory, now) = directory(loader.clone());
        address_of(&directory, Some("https://pronode1.io"), None).await;
        advance(&now, PROVIDER_LIST_MISS_RELOAD_MS);
        for _ in 0..3 {
            assert_eq!(
                address_of(&directory, Some("https://attacker.io"), None).await,
                None
            );
        }
        assert_eq!(loader.calls().len(), 2);
    }

    /// Not in the TS tests: `!providerUrl` treats an empty url as no url.
    #[tokio::test]
    async fn treats_an_empty_provider_url_as_none() {
        let loader = QueuedLoader::answering(vec![Ok(providers())]);
        let (directory, _) = directory(loader.clone());
        assert_eq!(address_of(&directory, Some(""), None).await, None);
        assert!(loader.calls().is_empty());
    }

    #[tokio::test]
    async fn returns_undefined_for_a_token_with_no_provider_url_without_loading() {
        let loader = QueuedLoader::answering(vec![Ok(providers())]);
        let (directory, _) = directory(loader.clone());
        assert_eq!(address_of(&directory, None, None).await, None);
        assert!(loader.calls().is_empty());
    }
}

mod development_provider_url {
    use super::*;

    #[test]
    fn is_localhost_when_nothing_overrides_it() {
        assert_eq!(get_development_provider_url(None), "https://localhost:9229");
        assert_eq!(DEFAULT_DEVELOPMENT_PROVIDER_URL, "https://localhost:9229");
    }

    #[test]
    fn is_the_override_when_one_is_set() {
        assert_eq!(
            get_development_provider_url(Some("https://192.0.2.10:9229")),
            "https://192.0.2.10:9229"
        );
    }

    #[test]
    fn drops_a_trailing_slash_so_the_url_composes_with_healthz() {
        assert_eq!(
            get_development_provider_url(Some("https://192.0.2.10:9229/")),
            "https://192.0.2.10:9229"
        );
    }

    #[test]
    fn falls_back_rather_than_yielding_an_empty_url() {
        for blank in [Some(""), Some("   "), None] {
            assert_eq!(
                get_development_provider_url(blank),
                DEFAULT_DEVELOPMENT_PROVIDER_URL,
                "{blank:?}"
            );
        }
    }

    #[test]
    fn reading_the_override_reads_the_environment_variable() {
        let _guard = ENV_LOCK
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        std::env::set_var(DEVELOPMENT_PROVIDER_URL_ENV, "https://198.51.100.7:9229");
        let value: Option<String> = read_development_provider_url_override();
        std::env::remove_var(DEVELOPMENT_PROVIDER_URL_ENV);
        assert_eq!(value.as_deref(), Some("https://198.51.100.7:9229"));
    }

    #[test]
    fn reading_the_override_is_undefined_when_the_variable_is_unset() {
        let _guard = ENV_LOCK
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        std::env::remove_var(DEVELOPMENT_PROVIDER_URL_ENV);
        assert_eq!(read_development_provider_url_override(), None);
    }

    #[test]
    fn defaults_when_the_variable_is_unset() {
        let _guard = ENV_LOCK
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        std::env::remove_var(DEVELOPMENT_PROVIDER_URL_ENV);
        assert_eq!(
            get_development_provider_url(read_development_provider_url_override().as_deref()),
            DEFAULT_DEVELOPMENT_PROVIDER_URL
        );
    }
}
