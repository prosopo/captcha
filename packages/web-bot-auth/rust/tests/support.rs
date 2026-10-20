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

use std::sync::atomic::{AtomicU64, AtomicUsize, Ordering};
use std::sync::Arc;

use crate::jwks_resolver::{
    BoxFuture, Clock, JwksFetch, JwksFetchError, JwksResolver, JwksResponse,
};

pub(crate) type FetchFn =
    dyn Fn(&str) -> BoxFuture<'static, Result<JwksResponse, JwksFetchError>> + Send + Sync;

/// An injectable fetch that records every URL it is asked for.
pub(crate) struct MockFetch {
    respond: Box<FetchFn>,
    pub(crate) calls: AtomicUsize,
    pub(crate) urls: std::sync::Mutex<Vec<String>>,
}

impl MockFetch {
    pub(crate) fn new(
        respond: impl Fn(&str) -> BoxFuture<'static, Result<JwksResponse, JwksFetchError>>
            + Send
            + Sync
            + 'static,
    ) -> Arc<Self> {
        Arc::new(MockFetch {
            respond: Box::new(respond),
            calls: AtomicUsize::new(0),
            urls: std::sync::Mutex::new(Vec::new()),
        })
    }

    pub(crate) fn ok(body: String, headers: Vec<(String, String)>) -> Arc<Self> {
        Self::new(move |_url: &str| {
            let response: JwksResponse =
                JwksResponse::from_bytes(200, headers.clone(), body.clone().into_bytes());
            Box::pin(async move { Ok(response) })
        })
    }

    pub(crate) fn call_count(&self) -> usize {
        self.calls.load(Ordering::SeqCst)
    }

    pub(crate) fn seen_urls(&self) -> Vec<String> {
        self.urls.lock().map(|u| u.clone()).unwrap_or_default()
    }
}

impl JwksFetch for MockFetch {
    fn fetch<'a>(&'a self, url: &'a str) -> BoxFuture<'a, Result<JwksResponse, JwksFetchError>> {
        self.calls.fetch_add(1, Ordering::SeqCst);
        if let Ok(mut urls) = self.urls.lock() {
            urls.push(url.to_string());
        }
        (self.respond)(url)
    }
}

/// A settable clock, the counterpart of vitest's fake timers.
#[derive(Clone)]
pub(crate) struct FakeClock(Arc<AtomicU64>);

impl FakeClock {
    pub(crate) fn new(now_ms: f64) -> Self {
        FakeClock(Arc::new(AtomicU64::new(now_ms.to_bits())))
    }

    pub(crate) fn set(&self, now_ms: f64) {
        self.0.store(now_ms.to_bits(), Ordering::SeqCst);
    }

    pub(crate) fn resolver(&self) -> JwksResolver {
        let shared: Arc<AtomicU64> = Arc::clone(&self.0);
        let clock: Clock = Box::new(move || f64::from_bits(shared.load(Ordering::SeqCst)));
        JwksResolver::with_clock(clock)
    }
}
