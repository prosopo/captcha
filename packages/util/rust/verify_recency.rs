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

use std::time::{SystemTime, UNIX_EPOCH};

use crate::js::parse_int;

/// Whether the timestamp before the first `___` in `challenge` is no more
/// than `max_verified_time` ms before now.
pub fn verify_recency(challenge: &str, max_verified_time: f64) -> bool {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0.0, |d| d.as_millis() as f64);
    verify_recency_at(challenge, max_verified_time, now)
}

/// [`verify_recency`] against a given `Date.now()` value.
pub fn verify_recency_at(challenge: &str, max_verified_time: f64, now_ms: f64) -> bool {
    let timestamp = challenge.split("___").next().unwrap_or("");
    if timestamp.is_empty() {
        return false;
    }
    now_ms - parse_int(timestamp, 10) <= max_verified_time
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compares_the_challenge_timestamp_with_now() {
        assert!(verify_recency_at("1000___abc", 500.0, 1500.0));
        assert!(!verify_recency_at("1000___abc", 499.0, 1500.0));
        assert!(!verify_recency_at("___abc", 500.0, 1500.0));
        assert!(!verify_recency_at("abc___1000", 500.0, 1500.0));
    }
}
