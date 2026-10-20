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

//! `PROSOPO_LOG_LEVEL` directives: a bare global level plus optional per-scope overrides,
//! e.g. `"warn,database=trace"`. Scope segments are separated by `:`, and a directive applies
//! to its scope and every scope beneath it.

use crate::js::js_trim;
use crate::level::LogLevel;
use std::collections::HashMap;
use std::sync::{Arc, LazyLock, RwLock};

/// Scope → level. The empty-string key is the global default.
pub type Directives = HashMap<String, LogLevel>;

pub fn parse_directives(raw: &str) -> Directives {
    let mut map = Directives::new();
    for part in raw.split(',') {
        let trimmed = js_trim(part);
        if trimmed.is_empty() {
            continue;
        }
        match trimmed.split_once('=') {
            None => {
                if let Ok(level) = trimmed.parse::<LogLevel>() {
                    map.insert(String::new(), level);
                }
            }
            Some((scope, level)) => {
                let scope = js_trim(scope);
                // Only a bare level may set the global default, so "=debug" is ignored.
                if scope.is_empty() {
                    continue;
                }
                if let Ok(level) = js_trim(level).parse::<LogLevel>() {
                    map.insert(scope.to_string(), level);
                }
            }
        }
    }
    map
}

/// The most specific directive matching `scope`, walking up its `:`-separated prefixes to the
/// global default, else `fallback`.
pub fn resolve_level(scope: &str, directives: &Directives, fallback: LogLevel) -> LogLevel {
    if let Some(level) = directives.get(scope) {
        return *level;
    }
    let parts: Vec<&str> = scope.split(':').collect();
    for i in (1..parts.len()).rev() {
        if let Some(level) = directives.get(&parts[..i].join(":")) {
            return *level;
        }
    }
    directives.get("").copied().unwrap_or(fallback)
}

/// A replaceable set of directives shared by every logger that holds it. Loggers read it at
/// emit time, so replacing it changes the filtering of loggers that already exist.
#[derive(Debug, Default)]
pub struct DirectiveStore {
    current: RwLock<Arc<Directives>>,
}

impl DirectiveStore {
    pub fn new(raw: &str) -> DirectiveStore {
        DirectiveStore {
            current: RwLock::new(Arc::new(parse_directives(raw))),
        }
    }

    pub fn set(&self, raw: &str) {
        let parsed = Arc::new(parse_directives(raw));
        match self.current.write() {
            Ok(mut guard) => *guard = parsed,
            Err(poisoned) => *poisoned.into_inner() = parsed,
        }
    }

    pub fn get(&self) -> Arc<Directives> {
        match self.current.read() {
            Ok(guard) => Arc::clone(&guard),
            Err(poisoned) => Arc::clone(&poisoned.into_inner()),
        }
    }
}

static GLOBAL_DIRECTIVES: LazyLock<Arc<DirectiveStore>> = LazyLock::new(|| {
    Arc::new(DirectiveStore::new(
        &std::env::var("PROSOPO_LOG_LEVEL").unwrap_or_default(),
    ))
});

/// The process-wide store, initialised from `PROSOPO_LOG_LEVEL` on first use.
pub fn global_directives() -> Arc<DirectiveStore> {
    Arc::clone(&GLOBAL_DIRECTIVES)
}

/// Replaces the process-wide directives. Accepts the same string as `PROSOPO_LOG_LEVEL`.
pub fn set_global_directives(raw: &str) {
    GLOBAL_DIRECTIVES.set(raw);
}
