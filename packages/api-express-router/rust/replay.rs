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

//! `JwtReplayGuard` and `createMemoryJwtReplayGuard` (jwtReplayGuard.ts).

use indexmap::IndexMap;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

pub trait JwtReplayGuard: Send + Sync {
    /// Records a token id. False when it was already recorded and has not yet expired: the
    /// token is being replayed.
    fn claim(&self, id: &str, expires_at_seconds: f64) -> bool;
}

/// The token ids seen in this process until they expire. Only tokens an admin key signed reach
/// it, so the cap guards against a misbehaving issuer rather than an attacker; when full, the
/// oldest entry goes.
pub struct MemoryJwtReplayGuard {
    seen: Mutex<IndexMap<String, f64>>,
    max_entries: usize,
    now_seconds: Box<dyn Fn() -> f64 + Send + Sync>,
}

impl MemoryJwtReplayGuard {
    pub fn new(max_entries: Option<usize>, now_seconds: Option<Box<dyn Fn() -> f64 + Send + Sync>>) -> MemoryJwtReplayGuard {
        MemoryJwtReplayGuard {
            seen: Mutex::new(IndexMap::new()),
            max_entries: max_entries.unwrap_or(10_000),
            now_seconds: now_seconds.unwrap_or_else(|| {
                Box::new(|| SystemTime::now().duration_since(UNIX_EPOCH).map(|elapsed| elapsed.as_millis() as f64 / 1000.0).unwrap_or(0.0))
            }),
        }
    }
}

impl JwtReplayGuard for MemoryJwtReplayGuard {
    fn claim(&self, id: &str, expires_at_seconds: f64) -> bool {
        let now: f64 = (self.now_seconds)();
        let mut seen = self.seen.lock().expect("lock");
        if seen.get(id).is_some_and(|previous| *previous >= now) {
            return false;
        }
        if seen.len() >= self.max_entries {
            seen.retain(|_, expires_at| *expires_at >= now);
            if seen.len() >= self.max_entries {
                seen.shift_remove_index(0);
            }
        }
        seen.insert(id.to_string(), expires_at_seconds);
        true
    }
}
