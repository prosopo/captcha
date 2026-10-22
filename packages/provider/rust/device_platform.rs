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

//! utils/devicePlatform.ts: the platform flags a routing machine and the puzzle escalation
//! read.

use crate::mobile_signals::{contains_ascii_insensitive, derive_mobile_verdict, MobileSignals};

/// `APPLE_UA_REGEX`. Covers desktop macOS as well as iOS.
const APPLE_UA: [&str; 5] = ["iphone", "ipad", "ipod", "macintosh", "mac os x"];

/// `RoutingMachinePlatform`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Platform {
    pub is_apple: bool,
    pub is_web_view: bool,
    pub is_mobile: bool,
}

/// `derivePlatform`: `web_view` comes from the encrypted detector payload, so the caller
/// supplies it; `signals` are whatever else it has, their own user agent and web view ignored.
pub fn derive_platform(user_agent: &str, web_view: bool, signals: MobileSignals<'_>) -> Platform {
    Platform {
        is_apple: contains_ascii_insensitive(user_agent, &APPLE_UA),
        is_web_view: web_view,
        is_mobile: derive_mobile_verdict(&MobileSignals { user_agent: Some(user_agent), web_view: Some(web_view), ..signals }).is_mobile,
    }
}
