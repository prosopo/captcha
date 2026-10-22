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

//! The node's maintenance mode (apiToggleMaintenanceModeEndpoint.ts): node-wide, from
//! `MAINTENANCE_MODE` until the admin endpoint changes it, and per site key. Neither outlives
//! the process.

use indexmap::IndexSet;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

pub struct MaintenanceMode {
    node: AtomicBool,
    site_keys: Mutex<IndexSet<String>>,
}

impl MaintenanceMode {
    /// `MAINTENANCE_MODE`, true when it reads `true` in any case.
    pub fn from_env(value: Option<&str>) -> MaintenanceMode {
        MaintenanceMode {
            node: AtomicBool::new(value.is_some_and(|value| value.to_lowercase() == "true")),
            site_keys: Mutex::new(IndexSet::new()),
        }
    }

    pub fn get(&self) -> bool {
        self.node.load(Ordering::Acquire)
    }

    pub fn set(&self, enabled: bool) {
        self.node.store(enabled, Ordering::Release);
    }

    pub fn site_keys(&self) -> Vec<String> {
        self.site_keys.lock().map(|keys| keys.iter().cloned().collect()).unwrap_or_default()
    }

    pub fn set_for_site_keys(&self, site_keys: &[String], enabled: bool) {
        if let Ok(mut keys) = self.site_keys.lock() {
            for site_key in site_keys {
                if enabled {
                    keys.insert(site_key.clone());
                } else {
                    keys.shift_remove(site_key);
                }
            }
        }
    }
}
