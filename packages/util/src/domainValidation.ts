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

import { Address4, Address6 } from "ip-address";
import { validateDomain } from "./url.js";

/**
 * Result of domain validation for SSRF protection
 */
export interface DomainValidationResult {
	/** Whether the domain is safe for outbound requests */
	isValid: boolean;
	/** Reason for rejection if invalid */
	reason?: string;
}

/**
 * Reserved/internal hostnames that should never be used for outbound requests
 */
const RESERVED_HOSTNAMES = new Set([
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
]);

/**
 * Internal/reserved TLDs that should be rejected
 * See: https://www.iana.org/domains/reserved
 */
const RESERVED_TLDS = new Set([
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
	"onion", // Tor hidden services
	"i2p", // I2P hidden services
]);

/**
 * AWS internal hostnames and metadata service patterns
 */
const AWS_INTERNAL_PATTERNS = [
	/^169\.254\.169\.254$/, // EC2 metadata service
	/^metadata\.google\.internal$/i,
	/^metadata\.google\.internal\./i,
	/\.internal$/i, // Generic internal suffix
	/\.ec2\.internal$/i, // AWS EC2 internal
	/^instance-data\./i, // AWS instance data
	/\.compute\.internal$/i, // AWS compute internal
];

/**
 * Checks if a string is an IPv4 address
 */
function isIPv4(str: string): boolean {
	try {
		new Address4(str);
		return true;
	} catch {
		return false;
	}
}

/**
 * Checks if a string is an IPv6 address (including bracketed format)
 */
function isIPv6(str: string): boolean {
	// Remove brackets if present (common in URLs)
	const cleaned = str.replace(/^\[|\]$/g, "");
	try {
		new Address6(cleaned);
		return true;
	} catch {
		return false;
	}
}

/**
 * Checks if an IPv4 address is in a reserved/private range
 */
function isReservedIPv4(ipStr: string): boolean {
	try {
		const ip = new Address4(ipStr);
		const bigInt = ip.bigInt();

		// 0.0.0.0/8 - Current network
		if (bigInt < BigInt("16777216")) return true;

		// 10.0.0.0/8 - Private
		if (bigInt >= BigInt("167772160") && bigInt < BigInt("184549376"))
			return true;

		// 100.64.0.0/10 - Carrier-grade NAT
		if (bigInt >= BigInt("1681915904") && bigInt < BigInt("1686110208"))
			return true;

		// 127.0.0.0/8 - Loopback
		if (bigInt >= BigInt("2130706432") && bigInt < BigInt("2147483648"))
			return true;

		// 169.254.0.0/16 - Link-local (includes AWS metadata)
		if (bigInt >= BigInt("2851995648") && bigInt < BigInt("2852061184"))
			return true;

		// 172.16.0.0/12 - Private
		if (bigInt >= BigInt("2886729728") && bigInt < BigInt("2887778304"))
			return true;

		// 192.0.0.0/24 - IETF Protocol Assignments
		if (bigInt >= BigInt("3221225472") && bigInt < BigInt("3221225728"))
			return true;

		// 192.0.2.0/24 - TEST-NET-1
		if (bigInt >= BigInt("3221225984") && bigInt < BigInt("3221226240"))
			return true;

		// 192.88.99.0/24 - 6to4 relay anycast
		if (bigInt >= BigInt("3227017984") && bigInt < BigInt("3227018240"))
			return true;

		// 192.168.0.0/16 - Private
		if (bigInt >= BigInt("3232235520") && bigInt < BigInt("3232301056"))
			return true;

		// 198.18.0.0/15 - Benchmark testing
		if (bigInt >= BigInt("3323068416") && bigInt < BigInt("3323199488"))
			return true;

		// 198.51.100.0/24 - TEST-NET-2
		if (bigInt >= BigInt("3325256704") && bigInt < BigInt("3325256960"))
			return true;

		// 203.0.113.0/24 - TEST-NET-3
		if (bigInt >= BigInt("3405803776") && bigInt < BigInt("3405804032"))
			return true;

		// 224.0.0.0/4 - Multicast
		if (bigInt >= BigInt("3758096384") && bigInt < BigInt("4026531840"))
			return true;

		// 240.0.0.0/4 - Reserved for future use (includes 255.255.255.255 broadcast)
		return bigInt >= BigInt("4026531840");
	} catch {
		return true; // If we can't parse it, treat as reserved for safety
	}
}

/**
 * Checks if an IPv6 address is in a reserved/private range
 */
function isReservedIPv6(ipStr: string): boolean {
	try {
		const cleaned = ipStr.replace(/^\[|\]$/g, "");
		const ip = new Address6(cleaned);

		// Check for common reserved ranges
		// ::1/128 - Loopback
		if (ip.isLoopback()) return true;

		// ::/128 - Unspecified
		if (cleaned === "::" || cleaned === "::0") return true;

		// ::ffff:0:0/96 - IPv4-mapped (check the IPv4 part)
		if (ip.is4()) {
			const v4 = ip.to4();
			return isReservedIPv4(v4.address);
		}

		// fe80::/10 - Link-local
		if (ip.isLinkLocal()) return true;

		// fc00::/7 - Unique local address (private)
		const firstWord = ip.parsedAddress[0];
		if (firstWord) {
			const firstByte = Number.parseInt(firstWord, 16);
			if ((firstByte & 0xfe) === 0xfc) return true;
		}

		// ff00::/8 - Multicast
		if (firstWord) {
			const firstByte = Number.parseInt(firstWord, 16);
			if ((firstByte & 0xff00) === 0xff00) return true;
		}

		// 2001:db8::/32 - Documentation
		const prefix = ip.parsedAddress.slice(0, 2).join(":");
		return prefix.toLowerCase() === "2001:db8";
	} catch {
		return true; // If we can't parse it, treat as reserved for safety
	}
}

/**
 * Validates a domain/hostname to ensure it's safe for outbound network requests.
 * This provides SSRF protection by rejecting:
 * - IP address literals (both IPv4 and IPv6)
 * - Localhost and loopback addresses
 * - Internal/reserved hostnames
 * - Private network ranges
 * - AWS/cloud metadata service endpoints
 * - Reserved TLDs
 *
 * @param domain - The domain to validate
 * @returns Validation result indicating if the domain is safe
 */
export function validateDomainForOutboundRequest(
	domain: string,
): DomainValidationResult {
	if (!domain) {
		return { isValid: false, reason: "Empty or invalid domain" };
	}

	const normalizedDomain = domain.toLowerCase().trim();

	if (!normalizedDomain) {
		return { isValid: false, reason: "Empty domain after normalization" };
	}

	// Check for IP literals
	if (isIPv4(normalizedDomain)) {
		if (isReservedIPv4(normalizedDomain)) {
			return {
				isValid: false,
				reason: "IPv4 address in reserved/private range",
			};
		}
		return { isValid: false, reason: "IP address literals are not allowed" };
	}

	if (isIPv6(normalizedDomain)) {
		if (isReservedIPv6(normalizedDomain)) {
			return {
				isValid: false,
				reason: "IPv6 address in reserved/private range",
			};
		}
		return { isValid: false, reason: "IP address literals are not allowed" };
	}

	// Check for reserved hostnames
	if (RESERVED_HOSTNAMES.has(normalizedDomain)) {
		return { isValid: false, reason: "Reserved hostname" };
	}

	// Check for AWS/cloud internal patterns
	for (const pattern of AWS_INTERNAL_PATTERNS) {
		if (pattern.test(normalizedDomain)) {
			return { isValid: false, reason: "Internal/cloud metadata hostname" };
		}
	}

	// Extract TLD and check against reserved TLDs
	const parts = normalizedDomain.split(".");
	if (parts.length > 0) {
		const tld = parts[parts.length - 1];
		if (tld && RESERVED_TLDS.has(tld)) {
			return { isValid: false, reason: `Reserved TLD: ${tld}` };
		}
	}

	return { isValid: validateDomain(domain) };
}

/**
 * Checks if a domain is safe for DNS lookups and HTTPS requests.
 * This is a convenience function that returns a boolean.
 *
 * @param domain - The domain to validate
 * @returns true if the domain is safe, false otherwise
 */
export function isDomainSafeForOutboundRequest(domain: string): boolean {
	return validateDomainForOutboundRequest(domain).isValid;
}
