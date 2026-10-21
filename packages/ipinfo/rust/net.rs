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

//! Node's `net.isIP`, which geoip2-node checks an address with before reading the database.
//! Node defines it with these regular expressions (lib/internal/net.js); an IPv6 address may
//! carry a zone.

use std::sync::LazyLock;

const V4_SEG: &str = "(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])";
const V6_SEG: &str = "(?:[0-9a-fA-F]{1,4})";

fn v4() -> String {
    format!("(?:{V4_SEG}\\.){{3}}{V4_SEG}")
}

static IPV4: LazyLock<regex::Regex> =
    LazyLock::new(|| regex::Regex::new(&format!("^{}$", v4())).expect("IPv4 pattern compiles"));

static IPV6: LazyLock<regex::Regex> = LazyLock::new(|| {
    let v4: String = v4();
    let s: &str = V6_SEG;
    let pattern: String = format!(
        "^(?:(?:{s}:){{7}}(?:{s}|:)|(?:{s}:){{6}}(?:{v4}|:{s}|:)|(?:{s}:){{5}}(?::{v4}|(?::{s}){{1,2}}|:)|(?:{s}:){{4}}(?:(?::{s}){{0,1}}:{v4}|(?::{s}){{1,3}}|:)|(?:{s}:){{3}}(?:(?::{s}){{0,2}}:{v4}|(?::{s}){{1,4}}|:)|(?:{s}:){{2}}(?:(?::{s}){{0,3}}:{v4}|(?::{s}){{1,5}}|:)|(?:{s}:){{1}}(?:(?::{s}){{0,4}}:{v4}|(?::{s}){{1,6}}|:)|(?::(?:(?::{s}){{0,5}}:{v4}|(?::{s}){{1,7}}|:)))(?:%[0-9a-zA-Z\\-.:]{{1,}})?$"
    );
    regex::Regex::new(&pattern).expect("IPv6 pattern compiles")
});

/// `net.isIP(value) !== 0`.
pub fn is_ip(value: &str) -> bool {
    IPV4.is_match(value) || IPV6.is_match(value)
}
