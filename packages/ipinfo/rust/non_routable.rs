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

use crate::js::parse_int_10;

/// `isNonRoutable`: loopback, link-local and private addresses, which no backend has data
/// for. It reads prefixes and does not check that the input is an address at all.
pub fn is_non_routable(ip: &str) -> bool {
    let normalised: &str = strip_ipv4_mapped_prefix(ip);
    if ["127.", "10.", "192.168.", "169.254."]
        .iter()
        .any(|prefix| normalised.starts_with(prefix))
        || normalised == "0.0.0.0"
    {
        return true;
    }
    if normalised.starts_with("172.") {
        let second: Option<f64> = parse_int_10(normalised.split('.').nth(1).unwrap_or(""));
        if second.is_some_and(|second| (16.0..=31.0).contains(&second)) {
            return true;
        }
    }
    if normalised == "::1" || normalised == "::" {
        return true;
    }
    let lower: String = normalised
        .chars()
        .take(3)
        .collect::<String>()
        .to_ascii_lowercase();
    // `/^f[cd]/i` (unique local) and `/^fe[89ab]/i` (link-local).
    lower.starts_with("fc")
        || lower.starts_with("fd")
        || ["fe8", "fe9", "fea", "feb"]
            .iter()
            .any(|prefix| lower.starts_with(prefix))
}

/// `ip.replace(/^::ffff:/i, "")`.
fn strip_ipv4_mapped_prefix(ip: &str) -> &str {
    match ip.get(..7) {
        Some(prefix) if prefix.eq_ignore_ascii_case("::ffff:") => &ip[7..],
        _ => ip,
    }
}
