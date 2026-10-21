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

//! providers.ts, server side: the cached provider list and the lookup of a token's issuer.
//! The widget's healthz pinning and random selection stay TS.

use crate::balancer::{HardcodedProvider, IpMode, LoadBalancer, PROVIDER_LIST_FETCH_TIMEOUT_MS};
use crate::error::Result;
use futures_util::future::{FutureExt, Shared};
use prosopo_types::config::EnvironmentTypes;
use prosopo_util_crypto::jwt::now_millis;
use std::collections::HashMap;
use std::future::Future;
use std::pin::Pin;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};

/// How long a loaded list is served; the hosted list asks for `max-age=300`.
pub const PROVIDER_LIST_TTL_MS: f64 = 5.0 * 60.0 * 1000.0;

/// How soon after a load a lookup miss may force another. A token names its provider url,
/// so an unknown url must not turn every request into a fetch of the list.
pub const PROVIDER_LIST_MISS_RELOAD_MS: f64 = 10.0 * 1000.0;

/// One list, shared by every caller that asked for it.
pub type ProviderList = Arc<[HardcodedProvider]>;

pub type LoadFuture = Pin<Box<dyn Future<Output = Result<Vec<HardcodedProvider>>> + Send>>;

/// Loads a provider list: `loadBalancer`, injected so the cache can be tested on its own.
pub trait LoadProviders: Send + Sync {
    fn load(&self, environment: EnvironmentTypes, ip_mode: Option<IpMode>) -> LoadFuture;
}

impl LoadProviders for LoadBalancer {
    fn load(&self, environment: EnvironmentTypes, ip_mode: Option<IpMode>) -> LoadFuture {
        let balancer: LoadBalancer = self.clone();
        Box::pin(async move {
            balancer
                .providers(environment, ip_mode, PROVIDER_LIST_FETCH_TIMEOUT_MS)
                .await
        })
    }
}

/// `Date.now()`; injected so tests can move time.
pub type Clock = Arc<dyn Fn() -> f64 + Send + Sync>;

type SharedLoad = Shared<Pin<Box<dyn Future<Output = Result<ProviderList>> + Send>>>;

type CacheKey = (EnvironmentTypes, Option<IpMode>);

struct Entry {
    providers: SharedLoad,
    loaded_at: f64,
    id: u64,
}

type Cache = Arc<Mutex<HashMap<CacheKey, Entry>>>;

/// The provider list per environment and `ip_mode`, loaded once and shared until it is
/// `PROVIDER_LIST_TTL_MS` old. A failed load is not kept, so the next caller retries.
pub struct ProviderDirectory {
    loader: Arc<dyn LoadProviders>,
    now_ms: Clock,
    cache: Cache,
    next_id: AtomicU64,
}

impl ProviderDirectory {
    pub fn new(loader: Arc<dyn LoadProviders>) -> ProviderDirectory {
        ProviderDirectory::with_clock(loader, Arc::new(now_millis))
    }

    pub fn with_clock(loader: Arc<dyn LoadProviders>, now_ms: Clock) -> ProviderDirectory {
        ProviderDirectory {
            loader,
            now_ms,
            cache: Arc::new(Mutex::new(HashMap::new())),
            next_id: AtomicU64::new(0),
        }
    }

    fn lock(cache: &Cache) -> std::sync::MutexGuard<'_, HashMap<CacheKey, Entry>> {
        cache.lock().expect("provider list cache lock")
    }

    /// Evicts a failed load inside the shared future, before any caller sees the failure, and
    /// only if a later load has not replaced it.
    fn start_load(&self, key: CacheKey, id: u64) -> SharedLoad {
        let pending: LoadFuture = self.loader.load(key.0, key.1);
        let cache: Cache = Arc::clone(&self.cache);
        let load = async move {
            let result: Result<ProviderList> = pending.await.map(ProviderList::from);
            if result.is_err() {
                let mut cache = Self::lock(&cache);
                if cache.get(&key).is_some_and(|entry| entry.id == id) {
                    cache.remove(&key);
                }
            }
            result
        };
        let load: Pin<Box<dyn Future<Output = Result<ProviderList>> + Send>> = Box::pin(load);
        load.shared()
    }

    /// `getProviders(environment, ipMode)`.
    pub async fn get_providers(
        &self,
        environment: EnvironmentTypes,
        ip_mode: Option<IpMode>,
    ) -> Result<ProviderList> {
        let key: CacheKey = (environment, ip_mode);
        let load: SharedLoad = {
            let mut cache = Self::lock(&self.cache);
            let now: f64 = (self.now_ms)();
            match cache.get(&key) {
                Some(entry) if now - entry.loaded_at < PROVIDER_LIST_TTL_MS => {
                    entry.providers.clone()
                }
                _ => {
                    let id: u64 = self.next_id.fetch_add(1, Ordering::SeqCst);
                    let load: SharedLoad = self.start_load(key, id);
                    cache.insert(
                        key,
                        Entry {
                            providers: load.clone(),
                            loaded_at: now,
                            id,
                        },
                    );
                    load
                }
            }
        };
        load.await
    }

    /// `findProvider(environment, providerUrl, ipMode)`: the provider that minted a token, by
    /// exact url, in the `ip_mode` section the token was minted against. A miss reloads the
    /// list, at most once per `PROVIDER_LIST_MISS_RELOAD_MS`, so a provider added part-way
    /// through the TTL is still found.
    pub async fn find_provider(
        &self,
        environment: EnvironmentTypes,
        provider_url: Option<&str>,
        ip_mode: Option<IpMode>,
    ) -> Result<Option<HardcodedProvider>> {
        let Some(provider_url) = provider_url.filter(|url| !url.is_empty()) else {
            return Ok(None);
        };
        let find = |providers: &ProviderList| {
            providers
                .iter()
                .find(|provider| provider.url == provider_url)
                .cloned()
        };
        if let Some(provider) = find(&self.get_providers(environment, ip_mode).await?) {
            return Ok(Some(provider));
        }
        {
            let key: CacheKey = (environment, ip_mode);
            let mut cache = Self::lock(&self.cache);
            let now: f64 = (self.now_ms)();
            if cache
                .get(&key)
                .is_some_and(|entry| now - entry.loaded_at < PROVIDER_LIST_MISS_RELOAD_MS)
            {
                return Ok(None);
            }
            cache.remove(&key);
        }
        Ok(find(&self.get_providers(environment, ip_mode).await?))
    }
}

impl Default for ProviderDirectory {
    fn default() -> ProviderDirectory {
        ProviderDirectory::new(Arc::new(LoadBalancer::default()))
    }
}

impl std::fmt::Debug for ProviderDirectory {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("ProviderDirectory").finish_non_exhaustive()
    }
}
