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

use url::Url;

use crate::error::UtilError;
use crate::js::{is_whitespace, trim, utf16_len};

/// `parseUrl`: the domain as an `https://` URL, with any `http(s)://` and
/// `www.` prefix dropped. Email addresses are rejected.
pub fn parse_url(domain: &str) -> Result<Url, UtilError> {
    if domain.contains('@') {
        return Err(UtilError::new("Invalid domain"));
    }
    let without_protocol = domain
        .strip_prefix("https://")
        .or_else(|| domain.strip_prefix("http://"))
        .unwrap_or(domain);
    let without_www = without_protocol
        .strip_prefix("www.")
        .unwrap_or(without_protocol);
    Url::parse(&format!("https://{without_www}")).map_err(|_| UtilError::new("Invalid URL"))
}

fn is_domain_char(c: char) -> bool {
    c.is_ascii_alphanumeric() || matches!(c, '_' | '.' | '-')
}

/// The conditions the validateDomain regex's lookarounds put on one
/// comma-separated domain. `domain` is a maximal run of `[\w.-]` characters.
fn domain_run_is_valid(domain: &str) -> bool {
    let bytes = domain.as_bytes();
    if !bytes[0].is_ascii_alphanumeric() || domain.contains('_') || !domain.contains('.') {
        return false;
    }
    let first_label_end = bytes
        .iter()
        .position(|b| !b.is_ascii_alphanumeric())
        .unwrap_or(bytes.len());
    let next = bytes.get(first_label_end).copied();
    let after_next = bytes.get(first_label_end + 1).copied();
    if next == Some(b'.') && after_next == Some(b'-') {
        return false;
    }
    if next == Some(b'-') && after_next == Some(b'.') && first_label_end + 2 < bytes.len() {
        return false;
    }
    if bytes.len() >= 254 {
        return false;
    }
    let labels: Vec<&str> = domain.split('.').collect();
    let (last, rest) = labels.split_last().expect("split always yields one label");
    if rest.iter().any(|label| label.len() >= 64) {
        return false;
    }
    let last_is_numeric = !last.is_empty() && last.bytes().all(|b| b.is_ascii_digit());
    !last_is_numeric && last.len() >= 2 && last.len() < 25
}

/// The regex in validateDomain (https://stackoverflow.com/a/57129472/1178971)
/// relies on variable-length lookbehind, which Rust's regex engines lack. This
/// is the language it accepts: whitespace-padded, comma-separated domains,
/// each checked by [`domain_run_is_valid`], with no whitespace at the end.
fn matches_domain_list(input: &str) -> bool {
    let chars: Vec<(usize, char)> = input.char_indices().collect();
    let mut i = 0;
    let skip_whitespace = |mut i: usize| {
        while i < chars.len() && is_whitespace(chars[i].1) {
            i += 1;
        }
        i
    };
    i = skip_whitespace(i);
    loop {
        let start = i;
        while i < chars.len() && is_domain_char(chars[i].1) {
            i += 1;
        }
        if i == start {
            return false;
        }
        let end = chars.get(i).map_or(input.len(), |(offset, _)| *offset);
        if !domain_run_is_valid(&input[chars[start].0..end]) {
            return false;
        }
        if i == chars.len() {
            return true;
        }
        i = skip_whitespace(i);
        if i == chars.len() || chars[i].1 != ',' {
            return false;
        }
        i = skip_whitespace(i + 1);
    }
}

pub fn validate_domain(domain: &str) -> bool {
    if utf16_len(domain) > 253 {
        return false;
    }
    if domain.contains("..") || domain.starts_with('.') || domain.ends_with('.') {
        return false;
    }
    if !matches_domain_list(domain) {
        return false;
    }
    parse_url(domain).is_ok()
}

/// Decodes a Google Translate proxy host (`my--site-com.translate.goog`)
/// back to the original (`my-site.com`). `None` for any other host.
pub fn decode_google_translate_host(hostname: &str) -> Option<String> {
    const SUFFIX: &str = ".translate.goog";
    let lower = hostname.to_lowercase();
    let host = lower.strip_suffix('.').unwrap_or(&lower);
    let encoded = host.strip_suffix(SUFFIX)?;
    if encoded.is_empty() {
        return None;
    }
    // A NUL already in the input is decoded to `-`, as the TS placeholder does.
    let placeholder = "\u{0}";
    Some(
        encoded
            .replace("--", placeholder)
            .replace('-', ".")
            .replace(placeholder, "-"),
    )
}

/// Every suffix of `domain` from the full name down to (excluding) the TLD,
/// after trimming, lowercasing and dropping a trailing dot. Empty for a
/// domain with empty labels.
pub fn build_domain_suffix_candidates(domain: &str) -> Vec<String> {
    let lower = trim(domain).to_lowercase();
    let normalized = lower.strip_suffix('.').unwrap_or(&lower);
    if normalized.is_empty() || normalized.contains("..") || normalized.starts_with('.') {
        return Vec::new();
    }
    let mut candidates: Vec<String> = Vec::new();
    let mut current = normalized;
    while let Some(dot) = current.find('.') {
        candidates.push(current.to_string());
        current = &current[dot + 1..];
    }
    candidates
}

/// Scheme, host, port and path of an http(s) URL, dropping the query,
/// fragment and credentials. `None` for anything else.
pub fn sanitise_page_url(raw: Option<&str>) -> Option<String> {
    let raw = raw.filter(|raw| !raw.is_empty())?;
    let mut url = Url::parse(raw).ok()?;
    if url.scheme() != "http" && url.scheme() != "https" {
        return None;
    }
    url.set_query(None);
    url.set_fragment(None);
    url.set_username("").ok()?;
    url.set_password(None).ok()?;
    Some(url.to_string())
}

fn hostname(raw: &str) -> Option<String> {
    let url = Url::parse(raw).ok()?;
    Some(url.host_str().unwrap_or("").to_lowercase())
}

/// Whether the widget frame is served from `protect.<tenant>` and the top
/// frame is the tenant or one of its subdomains.
pub fn is_protect_deployment(current_url: Option<&str>, iframe_url: Option<&str>) -> bool {
    let (Some(current_url), Some(iframe_url)) = (
        current_url.filter(|u| !u.is_empty()),
        iframe_url.filter(|u| !u.is_empty()),
    ) else {
        return false;
    };
    let (Some(current_host), Some(iframe_host)) = (hostname(current_url), hostname(iframe_url))
    else {
        return false;
    };
    if current_host.is_empty() || iframe_host.is_empty() {
        return false;
    }
    let Some(tail) = iframe_host.strip_prefix("protect.") else {
        return false;
    };
    if tail.is_empty() || !tail.contains('.') {
        return false;
    }
    current_host == tail || current_host.ends_with(&format!(".{tail}"))
}

#[cfg(test)]
mod tests {
    // Ported from src/tests/url.unit.test.ts
    use super::*;

    #[test]
    fn validates_valid_domains() {
        for domain in [
            "google.com",
            "www.google.com",
            "www.google.co.uk",
            "www.google.co",
            "google.co",
            "google.co.uk",
            "www.google.com.au",
            "prosopo.io",
            "averylongdomainnamethatnobodywouldeverremember.com",
        ] {
            assert!(validate_domain(domain), "{domain}");
        }
    }

    #[test]
    fn does_not_validate_an_email_address() {
        assert!(!validate_domain("blah@gmail.com"));
    }

    #[test]
    fn does_not_validate_a_domain_ending_in_a_dot() {
        assert!(!validate_domain("google."));
    }

    #[test]
    fn does_not_validate_a_domain_containing_an_at() {
        assert!(!validate_domain("goo@gle"));
    }

    #[test]
    fn does_not_validate_a_domain_with_a_leading_dot() {
        assert!(!validate_domain(".google.com"));
    }

    #[test]
    fn validates_a_very_long_domain_name() {
        let domain = format!(
            "{}.{}.{}.{}.co",
            "a".repeat(62),
            "a".repeat(62),
            "a".repeat(62),
            "a".repeat(61)
        );
        assert!(validate_domain(&domain));
    }

    #[test]
    fn does_not_validate_a_domain_name_that_is_too_long() {
        let domain = format!(
            "{}.{}.{}.{}.co",
            "a".repeat(62),
            "a".repeat(62),
            "a".repeat(62),
            "a".repeat(62)
        );
        assert!(!validate_domain(&domain));
    }

    #[test]
    fn does_not_validate_a_domain_containing_consecutive_dots() {
        assert!(!validate_domain("google..com"));
    }

    #[test]
    fn does_not_validate_a_domain_with_a_trailing_dot() {
        assert!(!validate_domain("google.com."));
    }

    fn candidates(domain: &str) -> Vec<String> {
        build_domain_suffix_candidates(domain)
    }

    #[test]
    fn suffix_candidates_for_a_multi_level_domain_exclude_the_tld() {
        assert_eq!(
            candidates("mail.fakemail.app"),
            ["mail.fakemail.app", "fakemail.app"]
        );
    }

    #[test]
    fn suffix_candidates_for_a_two_level_domain() {
        assert_eq!(candidates("fakemail.app"), ["fakemail.app"]);
    }

    #[test]
    fn suffix_candidates_empty_for_a_tld_only() {
        assert!(candidates("localhost").is_empty());
    }

    #[test]
    fn suffix_candidates_empty_for_an_empty_string() {
        assert!(candidates("").is_empty());
    }

    #[test]
    fn suffix_candidates_for_deep_subdomains() {
        assert_eq!(
            candidates("a.b.c.d.example.com"),
            [
                "a.b.c.d.example.com",
                "b.c.d.example.com",
                "c.d.example.com",
                "d.example.com",
                "example.com",
            ]
        );
    }

    #[test]
    fn suffix_candidates_empty_for_consecutive_dots() {
        assert!(candidates("test..domain").is_empty());
    }

    #[test]
    fn suffix_candidates_strip_a_trailing_dot() {
        assert_eq!(candidates("example.com."), ["example.com"]);
    }

    #[test]
    fn suffix_candidates_empty_for_a_leading_dot() {
        assert!(candidates(".example.com").is_empty());
    }

    #[test]
    fn suffix_candidates_normalize_to_lowercase() {
        assert_eq!(
            candidates("Mail.FakeMail.App"),
            ["mail.fakemail.app", "fakemail.app"]
        );
    }

    #[test]
    fn suffix_candidates_trim_surrounding_whitespace() {
        assert_eq!(candidates("  example.com  "), ["example.com"]);
    }

    #[test]
    fn suffix_candidates_go_from_most_to_least_specific() {
        let result = candidates("sub.domain.tld");
        assert_eq!(result.first().map(String::as_str), Some("sub.domain.tld"));
        assert_eq!(result.last().map(String::as_str), Some("domain.tld"));
    }

    fn decoded(host: &str) -> Option<String> {
        decode_google_translate_host(host)
    }

    #[test]
    fn translate_decodes_a_simple_two_label_domain() {
        assert_eq!(
            decoded("prosopo-io.translate.goog").as_deref(),
            Some("prosopo.io")
        );
    }

    #[test]
    fn translate_decodes_a_domain_with_subdomains() {
        assert_eq!(
            decoded("www-example-com.translate.goog").as_deref(),
            Some("www.example.com")
        );
    }

    #[test]
    fn translate_decodes_a_domain_containing_a_dash() {
        assert_eq!(
            decoded("my--site-com.translate.goog").as_deref(),
            Some("my-site.com")
        );
    }

    #[test]
    fn translate_decodes_mixed_dashes_and_subdomains() {
        assert_eq!(
            decoded("foo-my--site-co-uk.translate.goog").as_deref(),
            Some("foo.my-site.co.uk")
        );
    }

    #[test]
    fn translate_is_case_insensitive_on_the_suffix() {
        assert_eq!(
            decoded("Prosopo-IO.Translate.Goog").as_deref(),
            Some("prosopo.io")
        );
    }

    #[test]
    fn translate_ignores_a_trailing_dot() {
        assert_eq!(
            decoded("prosopo-io.translate.goog.").as_deref(),
            Some("prosopo.io")
        );
    }

    #[test]
    fn translate_returns_none_for_non_translate_goog_hosts() {
        assert_eq!(decoded("prosopo.io"), None);
        assert_eq!(decoded("translate.google.com"), None);
        assert_eq!(decoded("translate.goog"), None);
    }

    #[test]
    fn translate_returns_none_for_an_empty_encoded_subdomain() {
        assert_eq!(decoded(".translate.goog"), None);
    }

    fn sanitised(raw: Option<&str>) -> Option<String> {
        sanitise_page_url(raw)
    }

    #[test]
    fn sanitise_keeps_scheme_host_port_and_path() {
        assert_eq!(
            sanitised(Some("https://example.com/checkout/step-2")).as_deref(),
            Some("https://example.com/checkout/step-2")
        );
        assert_eq!(
            sanitised(Some("http://example.com:8080/a/b")).as_deref(),
            Some("http://example.com:8080/a/b")
        );
    }

    #[test]
    fn sanitise_strips_the_query_string_and_fragment() {
        assert_eq!(
            sanitised(Some("https://example.com/reset?token=secret#section")).as_deref(),
            Some("https://example.com/reset")
        );
    }

    #[test]
    fn sanitise_strips_embedded_credentials() {
        assert_eq!(
            sanitised(Some("https://user:pass@example.com/account")).as_deref(),
            Some("https://example.com/account")
        );
    }

    #[test]
    fn sanitise_rejects_non_http_schemes() {
        assert_eq!(sanitised(Some("javascript:alert(1)")), None);
        assert_eq!(sanitised(Some("data:text/html,<h1>x</h1>")), None);
        assert_eq!(sanitised(Some("ftp://example.com/file")), None);
    }

    #[test]
    fn sanitise_returns_none_for_missing_or_malformed_input() {
        assert_eq!(sanitised(None), None);
        assert_eq!(sanitised(Some("")), None);
        assert_eq!(sanitised(Some("not a url")), None);
        assert_eq!(sanitised(Some("/relative/path")), None);
    }

    #[test]
    fn protect_true_when_the_top_frame_is_on_the_tenant() {
        assert!(is_protect_deployment(
            Some("https://client.com/"),
            Some("https://protect.client.com/widget")
        ));
    }

    #[test]
    fn protect_true_when_the_top_frame_is_a_subdomain_of_the_tenant() {
        assert!(is_protect_deployment(
            Some("https://www.client.com/"),
            Some("https://protect.client.com/widget")
        ));
        assert!(is_protect_deployment(
            Some("https://foo.client.com/"),
            Some("https://protect.client.com/widget")
        ));
    }

    #[test]
    fn protect_is_case_insensitive_on_host() {
        assert!(is_protect_deployment(
            Some("https://CLIENT.com/"),
            Some("https://Protect.Client.COM/widget")
        ));
    }

    #[test]
    fn protect_rejects_hosts_that_share_a_suffix_without_a_dot_boundary() {
        assert!(!is_protect_deployment(
            Some("https://attackerclient.com/"),
            Some("https://protect.client.com/widget")
        ));
    }

    #[test]
    fn protect_rejects_mismatched_tenants() {
        assert!(!is_protect_deployment(
            Some("https://client.com/"),
            Some("https://protect.other.com/widget")
        ));
    }

    #[test]
    fn protect_rejects_iframes_not_served_from_protect() {
        assert!(!is_protect_deployment(
            Some("https://client.com/"),
            Some("https://widget.client.com/")
        ));
        assert!(!is_protect_deployment(
            Some("https://client.com/"),
            Some("https://client.com/widget")
        ));
    }

    #[test]
    fn protect_rejects_a_bare_protect_prefix_with_no_tail() {
        assert!(!is_protect_deployment(
            Some("https://client.com/"),
            Some("https://protect./widget")
        ));
    }

    #[test]
    fn protect_false_when_either_url_is_missing_or_unparseable() {
        assert!(!is_protect_deployment(
            None,
            Some("https://protect.client.com/")
        ));
        assert!(!is_protect_deployment(Some("https://client.com/"), None));
        assert!(!is_protect_deployment(None, None));
        assert!(!is_protect_deployment(
            Some("not a url"),
            Some("https://protect.client.com/")
        ));
    }
}
