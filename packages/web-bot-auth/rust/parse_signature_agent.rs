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

//! `Signature-Agent` comes in two forms: a bare quoted string
//! (`"https://chatgpt.com"`, draft 03 and earlier) and an RFC 8941
//! dictionary (`g="https://agent.bot.goog"`, draft 04+). The first
//! dictionary entry wins.

use std::fmt;

use url::Url;

use crate::js::{is_js_whitespace, js_trim};

/// The `TypeError` the WHATWG `URL` constructor throws.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct InvalidUrl;

impl fmt::Display for InvalidUrl {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("Invalid URL")
    }
}

impl std::error::Error for InvalidUrl {}

/// Lowercase scheme and host, no trailing slash (Cloudflare's canonical
/// form), so the result compares equal to the agent URLs stored in access
/// rules.
pub fn normalise_signature_agent_url(raw: &str) -> Result<String, InvalidUrl> {
    let mut url: Url = Url::parse(raw).map_err(|_| InvalidUrl)?;
    if let Some(host) = url.host_str() {
        let lowered: String = host.to_lowercase();
        if lowered != host {
            // Mirrors the JS `hostname` setter, which ignores values it cannot apply.
            let _ = url.set_host(Some(&lowered));
        }
    }
    if url.path() == "/" {
        url.set_path("");
    }
    let serialised: &str = url.as_str();
    Ok(serialised
        .strip_suffix('/')
        .unwrap_or(serialised)
        .to_string())
}

/// `^"(https?:\/\/[^"]+)"$`
fn match_bare_quoted(s: &str) -> Option<&str> {
    let inner: &str = s.strip_prefix('"')?.strip_suffix('"')?;
    if inner.contains('"') {
        return None;
    }
    let rest: &str = inner
        .strip_prefix("https://")
        .or_else(|| inner.strip_prefix("http://"))?;
    (!rest.is_empty()).then_some(inner)
}

/// `^\s*[a-zA-Z][a-zA-Z0-9_-]*="(https?:\/\/[^"]+)"`
fn match_dict_entry(s: &str) -> Option<&str> {
    let s: &str = s.trim_start_matches(is_js_whitespace);
    let mut chars = s.char_indices();
    if !chars.next()?.1.is_ascii_alphabetic() {
        return None;
    }
    let key_end: usize = chars
        .find(|(_, c)| !(c.is_ascii_alphanumeric() || *c == '_' || *c == '-'))
        .map_or(s.len(), |(i, _)| i);
    let value: &str = s[key_end..].strip_prefix("=\"")?;
    let close: usize = value.find('"')?;
    let url: &str = &value[..close];
    let rest: &str = url
        .strip_prefix("https://")
        .or_else(|| url.strip_prefix("http://"))?;
    (!rest.is_empty()).then_some(url)
}

/// The signer URL named by a `Signature-Agent` header, normalised. `Ok(None)`
/// when the header is in neither form; `Err` when it names an unparseable URL
/// (the TS throws there).
pub fn parse_signature_agent_header(raw: &str) -> Result<Option<String>, InvalidUrl> {
    let trimmed: &str = js_trim(raw);
    match match_bare_quoted(trimmed).or_else(|| match_dict_entry(trimmed)) {
        Some(url) => normalise_signature_agent_url(url).map(Some),
        None => Ok(None),
    }
}
