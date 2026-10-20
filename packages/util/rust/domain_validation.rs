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

use crate::ip::{Address4, Address6};
use crate::js::trim;
use crate::url::validate_domain;

/// Whether a domain is safe for outbound requests, and why not if it isn't.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DomainValidationResult {
    pub is_valid: bool,
    pub reason: Option<String>,
}

impl DomainValidationResult {
    fn valid() -> Self {
        Self {
            is_valid: true,
            reason: None,
        }
    }

    fn invalid(reason: impl Into<String>) -> Self {
        Self {
            is_valid: false,
            reason: Some(reason.into()),
        }
    }
}

const RESERVED_HOSTNAMES: [&str; 11] = [
    "localhost",
    "localhost.localdomain",
    "local",
    "broadcasthost",
    "ip6-localhost",
    "ip6-loopback",
    "ip6-localnet",
    "ip6-mcastprefix",
    "ip6-allnodes",
    "ip6-allrouters",
    "ip6-allhosts",
];

/// See https://www.iana.org/domains/reserved
const RESERVED_TLDS: [&str; 13] = [
    "localhost",
    "local",
    "internal",
    "intranet",
    "lan",
    "home",
    "corp",
    "private",
    "test",
    "example",
    "invalid",
    "onion",
    "i2p",
];

/// The TS `AWS_INTERNAL_PATTERNS` regexes, applied to an already-lowercased name.
fn is_cloud_internal(domain: &str) -> bool {
    domain == "169.254.169.254"
        || domain == "metadata.google.internal"
        || domain.starts_with("metadata.google.internal.")
        || domain.ends_with(".internal")
        || domain.starts_with("instance-data.")
}

/// `[start, end)` IPv4 ranges treated as reserved, as `bigInt()` values.
const RESERVED_IPV4_RANGES: [(u128, u128); 14] = [
    (0, 16_777_216),                // 0.0.0.0/8
    (167_772_160, 184_549_376),     // 10.0.0.0/8
    (1_681_915_904, 1_686_110_208), // 100.64.0.0/10
    (2_130_706_432, 2_147_483_648), // 127.0.0.0/8
    (2_851_995_648, 2_852_061_184), // 169.254.0.0/16
    (2_886_729_728, 2_887_778_304), // 172.16.0.0/12
    (3_221_225_472, 3_221_225_728), // 192.0.0.0/24
    (3_221_225_984, 3_221_226_240), // 192.0.2.0/24
    (3_227_017_984, 3_227_018_240), // 192.88.99.0/24
    (3_232_235_520, 3_232_301_056), // 192.168.0.0/16
    (3_323_068_416, 3_323_199_488), // 198.18.0.0/15
    (3_325_256_704, 3_325_256_960), // 198.51.100.0/24
    (3_405_803_776, 3_405_804_032), // 203.0.113.0/24
    (3_758_096_384, u128::MAX),     // 224.0.0.0/4 and 240.0.0.0/4
];

fn is_reserved_ipv4_value(value: u128) -> bool {
    RESERVED_IPV4_RANGES
        .iter()
        .any(|(start, end)| value >= *start && value < *end)
}

/// Unparseable input counts as reserved, so a parser quirk can't open an SSRF hole.
fn is_reserved_ipv4(ip: &str) -> bool {
    Address4::new(ip).map_or(true, |a| is_reserved_ipv4_value(a.big_int()))
}

fn strip_brackets(s: &str) -> &str {
    let s = s.strip_prefix('[').unwrap_or(s);
    s.strip_suffix(']').unwrap_or(s)
}

fn is_ipv6(s: &str) -> bool {
    Address6::is_valid(strip_brackets(s))
}

fn is_reserved_ipv6(ip: &str) -> bool {
    let cleaned = strip_brackets(ip);
    let Ok(address) = Address6::new(cleaned) else {
        return true;
    };
    if address.is_loopback() || address.is_link_local() {
        return true;
    }
    if cleaned == "::" || cleaned == "0:0:0:0:0:0:0:0" {
        return true;
    }
    if address.is4() {
        return is_reserved_ipv4(address.to4().address());
    }
    let groups = address.groups();
    let first_octet = groups[0] >> 8;
    // fc00::/7 unique local, ff00::/8 multicast
    if (first_octet & 0xfe) == 0xfc || first_octet == 0xff {
        return true;
    }
    // 2001:db8::/32 documentation
    groups[0] == 0x2001 && groups[1] == 0xdb8
}

/// SSRF guard for a domain the provider is about to make a request to:
/// rejects IP literals, localhost and reserved names, cloud metadata hosts,
/// reserved TLDs and syntactically invalid domains.
pub fn validate_domain_for_outbound_request(domain: &str) -> DomainValidationResult {
    if domain.is_empty() {
        return DomainValidationResult::invalid("Empty or invalid domain");
    }
    let lower = domain.to_lowercase();
    let normalized = trim(&lower);
    if normalized.is_empty() {
        return DomainValidationResult::invalid("Empty domain after normalization");
    }

    if Address4::is_valid(normalized) {
        if is_reserved_ipv4(normalized) {
            return DomainValidationResult::invalid("IPv4 address in reserved/private range");
        }
        return DomainValidationResult::invalid("IP address literals are not allowed");
    }
    if is_ipv6(normalized) {
        if is_reserved_ipv6(normalized) {
            return DomainValidationResult::invalid("IPv6 address in reserved/private range");
        }
        return DomainValidationResult::invalid("IP address literals are not allowed");
    }

    if RESERVED_HOSTNAMES.contains(&normalized) {
        return DomainValidationResult::invalid("Reserved hostname");
    }
    if is_cloud_internal(normalized) {
        return DomainValidationResult::invalid("Internal/cloud metadata hostname");
    }

    let parts: Vec<&str> = normalized.split('.').collect();
    if parts.iter().any(|part| part.is_empty()) {
        return DomainValidationResult::invalid("Domain contains empty labels");
    }
    if parts.len() == 1 {
        return DomainValidationResult::invalid("Domain must contain a TLD");
    }
    let tld = parts[parts.len() - 1];
    if RESERVED_TLDS.contains(&tld) {
        return DomainValidationResult::invalid(format!("Reserved TLD: {tld}"));
    }
    if !validate_domain(normalized) {
        return DomainValidationResult::invalid("Domain failed syntax validation");
    }
    DomainValidationResult::valid()
}

pub fn is_domain_safe_for_outbound_request(domain: &str) -> bool {
    validate_domain_for_outbound_request(domain).is_valid
}

#[cfg(test)]
mod tests {
    // Ported from src/tests/domainValidation.unit.test.ts
    use super::*;

    fn rejected_with(domains: &[&str], reason_part: &str) {
        for domain in domains {
            let result = validate_domain_for_outbound_request(domain);
            assert!(!result.is_valid, "{domain} must be rejected");
            let reason = result.reason.unwrap_or_default();
            assert!(reason.contains(reason_part), "{domain}: {reason}");
        }
    }

    fn rejected(domains: &[&str]) {
        rejected_with(domains, "");
    }

    #[test]
    fn accepts_valid_public_domains() {
        for domain in [
            "example.com",
            "sub.example.com",
            "deep.sub.example.com",
            "example.co.uk",
            "my-domain.com",
            "my-domain-123.org",
            "a1b2c3.net",
        ] {
            assert!(
                validate_domain_for_outbound_request(domain).is_valid,
                "{domain}"
            );
        }
    }

    #[test]
    fn rejects_empty_strings() {
        rejected(&["", "   "]);
    }

    #[test]
    fn rejects_ipv4_addresses() {
        rejected_with(
            &[
                "192.168.1.1",
                "10.0.0.1",
                "172.16.0.1",
                "8.8.8.8",
                "1.1.1.1",
            ],
            "IP",
        );
    }

    #[test]
    fn rejects_ipv6_loopback() {
        rejected_with(&["::1", "0:0:0:0:0:0:0:1"], "reserved");
    }

    #[test]
    fn rejects_ipv6_unspecified() {
        rejected_with(&["::", "0:0:0:0:0:0:0:0"], "reserved");
    }

    #[test]
    fn rejects_ipv6_link_local() {
        rejected_with(&["fe80::1", "fe80::dead:beef", "fe80::1%eth0"], "reserved");
    }

    #[test]
    fn rejects_ipv6_unique_local() {
        rejected_with(
            &[
                "fc00::1",
                "fc00:dead:beef::1",
                "fd00::1",
                "fd12:3456:789a::1",
            ],
            "reserved",
        );
    }

    #[test]
    fn rejects_ipv6_multicast() {
        rejected_with(&["ff00::1", "ff02::1", "ff02::2", "ff05::101"], "reserved");
    }

    #[test]
    fn rejects_ipv6_documentation_range() {
        rejected_with(&["2001:db8::1", "2001:db8:85a3::8a2e:370:7334"], "reserved");
    }

    #[test]
    fn rejects_ipv4_mapped_addresses_of_private_ipv4() {
        rejected_with(
            &["::ffff:192.168.1.1", "::ffff:127.0.0.1", "::ffff:10.0.0.1"],
            "reserved",
        );
    }

    #[test]
    fn rejects_bracketed_ipv6_literals() {
        rejected_with(&["[::1]", "[fe80::1]", "[fc00::1]", "[ff02::1]"], "IP");
    }

    #[test]
    fn rejects_any_ipv6_literal_even_when_globally_routable() {
        rejected_with(
            &[
                "2606:4700:4700::1111",
                "2001:4860:4860::8888",
                "2400:cb00:2048::1",
            ],
            "IP",
        );
    }

    #[test]
    fn rejects_reserved_ipv4_ranges() {
        rejected_with(
            &[
                "127.0.0.1",
                "10.0.0.1",
                "172.16.0.1",
                "192.168.0.1",
                "169.254.169.254",
                "0.0.0.0",
                "255.255.255.255",
                "100.64.0.1",
            ],
            "reserved",
        );
    }

    #[test]
    fn rejects_localhost_variants() {
        rejected(&["localhost", "LOCALHOST", "localhost.localdomain", "local"]);
    }

    #[test]
    fn rejects_other_reserved_hostnames() {
        rejected(&["broadcasthost", "ip6-localhost", "ip6-loopback"]);
    }

    #[test]
    fn rejects_domains_with_reserved_tlds() {
        rejected_with(
            &[
                "myserver.localhost",
                "myhost.local",
                "database.intranet",
                "router.lan",
                "nas.home",
                "hidden.onion",
            ],
            "TLD",
        );
    }

    #[test]
    fn rejects_internal_domains() {
        let result = validate_domain_for_outbound_request("server.internal");
        assert!(!result.is_valid);
        assert!(result.reason.is_some());
    }

    #[test]
    fn rejects_the_aws_metadata_service() {
        assert!(!validate_domain_for_outbound_request("169.254.169.254").is_valid);
    }

    #[test]
    fn rejects_cloud_internal_hostnames() {
        rejected(&[
            "metadata.google.internal",
            "instance-data.ec2.internal",
            "ip-10-0-0-1.ec2.internal",
            "myhost.compute.internal",
            "something.internal",
        ]);
    }

    #[test]
    fn rejects_single_label_domains() {
        rejected_with(
            &["myserver", "database", "router", "intranet-server"],
            "TLD",
        );
    }

    #[test]
    fn rejects_domains_with_empty_labels() {
        rejected(&[".example.com", "example..com", "example.com."]);
    }

    #[test]
    fn handles_uppercase_domains() {
        assert!(validate_domain_for_outbound_request("EXAMPLE.COM").is_valid);
        assert!(!validate_domain_for_outbound_request("LOCALHOST").is_valid);
        assert!(!validate_domain_for_outbound_request("MyServer.LOCAL").is_valid);
    }

    #[test]
    fn is_domain_safe_true_for_valid_domains() {
        assert!(is_domain_safe_for_outbound_request("example.com"));
        assert!(is_domain_safe_for_outbound_request("google.com"));
    }

    #[test]
    fn is_domain_safe_false_for_invalid_domains() {
        for domain in ["localhost", "127.0.0.1", "192.168.1.1", "server.internal"] {
            assert!(!is_domain_safe_for_outbound_request(domain), "{domain}");
        }
    }
}
