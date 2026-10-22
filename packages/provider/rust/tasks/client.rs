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

//! clientTasks.ts: whether a site's allowed domain patterns admit a request's origin.

use prosopo_logger::{LogRecord, Logger};
use serde_json::json;

/// `matchesGlob`: `*` matches any run of characters, without backtracking blow-up; compared in
/// UTF-16 code units, as JS strings are.
pub fn matches_glob(pattern: &str, text: &str) -> bool {
    let pattern: Vec<u16> = pattern.encode_utf16().collect();
    let text: Vec<u16> = text.encode_utf16().collect();
    let star: u16 = u16::from(b'*');
    let (mut p, mut t): (usize, usize) = (0, 0);
    let (mut star_p, mut star_t): (Option<usize>, usize) = (None, 0);
    while t < text.len() {
        if p < pattern.len() && pattern[p] == star {
            star_p = Some(p);
            p += 1;
            star_t = t;
        } else if p < pattern.len() && pattern[p] == text[t] {
            p += 1;
            t += 1;
        } else if let Some(star) = star_p {
            p = star + 1;
            star_t += 1;
            t = star_t;
        } else {
            return false;
        }
    }
    while p < pattern.len() && pattern[p] == star {
        p += 1;
    }
    p == pattern.len()
}

/// `parseUrl(text).hostname` without one trailing dot.
fn host(text: &str) -> Result<String, String> {
    let url: url::Url = prosopo_util::parse_url(text).map_err(|error| error.to_string())?;
    let hostname: String = url.host_str().unwrap_or_default().to_string();
    Ok(hostname.strip_suffix('.').map(str::to_string).unwrap_or(hostname))
}

fn pattern_matches(referrer: &str, client_domain: &str) -> Result<bool, String> {
    let referrer_host: String = host(referrer)?;
    let pattern: String = client_domain.trim().to_lowercase();
    if pattern == "*" {
        return Ok(true);
    }
    if pattern == "localhost" {
        return Ok(referrer_host == "localhost" || referrer_host.starts_with("localhost:"));
    }
    if let Some(suffix) = pattern.strip_prefix("*.") {
        let allowed: String = host(suffix)?;
        return Ok(referrer_host.ends_with(&format!(".{allowed}")) || referrer_host == allowed);
    }
    if pattern.contains('*') {
        return Ok(matches_glob(&pattern, &referrer_host.to_lowercase()));
    }
    let allowed: String = host(&pattern)?;
    Ok(referrer_host == allowed || referrer_host.ends_with(&format!(".{allowed}")))
}

/// `domainPatternMatcher`: `*`, `localhost`, `*.example.com`, a glob, or a domain and its
/// subdomains. What does not parse matches nothing.
pub fn domain_pattern_matcher(referrer: &str, client_domain: &str, logger: &Logger) -> bool {
    if referrer.is_empty() || client_domain.is_empty() {
        return false;
    }
    pattern_matches(referrer, client_domain).unwrap_or_else(|_| {
        logger.error(|| LogRecord::msg("Error in domainPatternMatcher").with_data(json!({ "referrer": referrer, "clientDomain": client_domain })));
        false
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn globs_as_the_ts_does() {
        assert!(matches_glob("app-*.example.com", "app-1.example.com"));
        assert!(matches_glob("*", ""));
        assert!(matches_glob("a*b*c", "aXbYc"));
        assert!(!matches_glob("a*b", "ac"));
        assert!(matches_glob("**", "x"));
        assert!(!matches_glob("x", ""));
    }
}

#[cfg(test)]
mod equivalence {
    use super::*;
    use serde_json::Value;

    const VECTORS: &str = include_str!("../equivalence/client-tasks-vectors.json");

    #[test]
    fn globs_and_domain_patterns_match_as_in_the_ts() {
        let vectors: Value = serde_json::from_str(VECTORS).expect("client-tasks-vectors.json parses");
        let logger: Logger = prosopo_logger::get_logger(prosopo_logger::LogLevel::Fatal, "equivalence");
        let mut failures: Vec<String> = Vec::new();
        for case in vectors["globs"].as_array().expect("globs") {
            let (pattern, text, expected) = (case[0].as_str().expect("a pattern"), case[1].as_str().expect("a text"), case[2].as_bool().expect("a result"));
            if matches_glob(pattern, text) != expected {
                failures.push(format!("matchesGlob({pattern:?}, {text:?}) should be {expected}"));
            }
        }
        for case in vectors["matches"].as_array().expect("matches") {
            let (referrer, domain, expected) = (case[0].as_str().expect("a referrer"), case[1].as_str().expect("a domain"), case[2].as_bool().expect("a result"));
            if domain_pattern_matcher(referrer, domain, &logger) != expected {
                failures.push(format!("domainPatternMatcher({referrer:?}, {domain:?}) should be {expected}"));
            }
        }
        assert!(failures.is_empty(), "{} differ:\n{}", failures.len(), failures.join("\n"));
    }
}
