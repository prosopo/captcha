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

const isIPAddress = (hostname: string): boolean => {
	try {
		new Address4(hostname);
		return true;
	} catch {
		try {
			new Address6(hostname);
			return true;
		} catch {
			return false;
		}
	}
};

export const getURLProtocol = (url: URL) => {
	if (!isIPAddress(url.hostname)) {
		return "https";
	}

	return "http";
};

export const parseUrl = (domain: string) => {
	//check the url is not an email address
	if (domain.match(/@/)) {
		throw new Error("Invalid domain");
	}

	return new URL(
		`https://${domain.replace(/^https?:\/\//, "").replace(/^www\./, "")}`,
	);
};

export const validateDomain = (domain: string): boolean => {
	if (domain.length > 253) {
		return false;
	}

	// If there are two or more dots in a row, or if the domain starts or ends with a dot, it's invalid
	if (domain.includes("..") || domain.startsWith(".") || domain.endsWith(".")) {
		return false;
	}

	// https://stackoverflow.com/a/57129472/1178971
	if (
		!domain.match(
			/^\s*(?!.*?_.*?)(?!(?:[\d\w]+?\.)?\-[\w\d\.\-]*?)(?![\w\d]+?\-\.(?:[\d\w\.\-]+?))(?=[\w\d])(?=[\w\d\.\-]*?\.+[\w\d\.\-]*?)(?![\w\d\.\-]{254})(?!(?:\.?[\w\d\-\.]*?[\w\d\-]{64,}\.)+?)[\w\d\.\-]+?(?<![\w\d\-\.]*?\.[\d]+?)(?<=[\w\d\-]{2,})(?<![\w\d\-]{25})(\s*,\s*(?!.*?_.*?)(?!(?:[\d\w]+?\.)?\-[\w\d\.\-]*?)(?![\w\d]+?\-\.(?:[\d\w\.\-]+?))(?=[\w\d])(?=[\w\d\.\-]*?\.+[\w\d\.\-]*?)(?![\w\d\.\-]{254})(?!(?:\.?[\w\d\-\.]*?[\w\d\-]{64,}\.)+?)[\w\d\.\-]+?(?<![\w\d\-\.]*?\.[\d]+?)(?<=[\w\d\-]{2,})(?<![\w\d\-]{25}))*$/,
		)
	) {
		return false;
	}

	try {
		parseUrl(domain);
	} catch (e) {
		return false;
	}

	return true;
};

/**
 * @description Decodes a Google Translate proxy hostname back to the original host.
 * Google Translate proxies a site under `<encoded>.translate.goog`, where the original
 * hostname is encoded by replacing dots with single dashes and dashes with double dashes.
 * For example:
 *   - "prosopo.io"     → "prosopo-io.translate.goog"
 *   - "www.example.com" → "www-example-com.translate.goog"
 *   - "my-site.com"     → "my--site-com.translate.goog"
 * Returns the decoded original hostname, or null if the input is not a translate.goog host.
 */
export const decodeGoogleTranslateHost = (hostname: string): string | null => {
	const suffix = ".translate.goog";
	const host = hostname.toLowerCase().replace(/\.$/, "");
	if (!host.endsWith(suffix)) return null;
	const encoded = host.slice(0, -suffix.length);
	if (!encoded) return null;
	const placeholder = "\x00";
	return encoded
		.replace(/--/g, placeholder)
		.replace(/-/g, ".")
		.replace(new RegExp(placeholder, "g"), "-");
};

export const domainIsLocalhost = (domain: string) => {
	try {
		const url = new URL(`http://${domain}`);
		const host = url.hostname.toLowerCase();
		return (
			host === "localhost" ||
			host.endsWith(".localhost") ||
			host === "127.0.0.1" ||
			host === "::1"
		);
	} catch {
		// If parsing fails, fall back to simple checks
		const lower = domain.toLowerCase();
		return (
			lower === "localhost" ||
			lower === "127.0.0.1" ||
			lower === "::1" ||
			lower === "[::1]"
		);
	}
};

/**
 * @description Validates a domain pattern for site configuration
 * Accepts plain domains like "example.com" as well as simple wildcard patterns:
 * "*"               → allow all
 * "*.example.com"   → any subdomain of example.com (not example.com itself)
 * "*example*"       → glob-style match anywhere within the hostname
 * "localhost"       → allowed
 * This does NOT accept full regex; only '*' is supported as a wildcard.
 */
export const validateDomainPattern = (input: string): boolean => {
	if (!input) return false;
	const domain = input.trim().toLowerCase();
	if (domain === "*") return true;
	if (domain === "localhost") return true;

	// Must only contain hostname characters or '*'
	if (!/^[a-z0-9\-\.*]+(\.[a-z0-9\-\.*]+)*$/.test(domain)) {
		return false;
	}

	// Subdomain wildcard pattern: *.example.com
	if (/^\*\.[^*]+$/.test(domain)) {
		const suffix = domain.slice(2);
		return validateDomain(suffix);
	}

	// General glob pattern like *example* or example* or *example.com
	if (domain.includes("*")) {
		// Ensure at least one non-wildcard character exists
		return /[a-z0-9]/.test(domain.replace(/\*/g, ""));
	}

	return validateDomain(domain);
};

/**
 * @description Builds all suffix candidates for a domain by progressively stripping the leftmost label.
 * For "mail.fakemail.app" this produces:
 *   ["mail.fakemail.app", "fakemail.app"]
 * This allows a single DB entry of "fakemail.app" to match queries for
 * "mail.fakemail.app", "sub.fakemail.app", etc.
 * The final TLD (e.g. "app", "com") is excluded as it would match all domains with that TLD.
 *
 * The input is normalized before processing: trimmed, lowercased, and any trailing dot
 * (FQDN notation) is stripped. Domains containing empty labels (consecutive dots, or a
 * leading dot after normalization) are considered invalid and return an empty array.
 *
 * @param domain The domain to generate suffix candidates for
 * @returns Array of domain suffix candidates, from most specific to least specific (excluding TLD),
 *          or an empty array if the input is empty or contains empty labels.
 */
export const buildDomainSuffixCandidates = (domain: string): string[] => {
	// Normalize: trim whitespace, lowercase, strip a single trailing dot (FQDN notation).
	const normalized = domain.trim().toLowerCase().replace(/\.$/, "");

	if (normalized.length === 0) {
		return [];
	}

	// Reject domains with empty labels (consecutive dots or a leading dot).
	if (normalized.includes("..") || normalized.startsWith(".")) {
		return [];
	}

	const candidates: string[] = [];
	let current = normalized;
	while (current.length > 0) {
		const dotIndex = current.indexOf(".");
		if (dotIndex === -1) {
			// Only the TLD remains – exclude it.
			break;
		}
		candidates.push(current);
		current = current.substring(dotIndex + 1);
	}
	return candidates;
};

/**
 * @description Reduces a page URL to just the page a user is on: scheme +
 * host (+ port) + path. The query string, fragment and any embedded
 * credentials (`user:pass@`) are dropped so we never persist secrets that a
 * site may carry in its URL (tokens, session ids, reset codes, …).
 *
 * Only http(s) pages are accepted; anything else (javascript:, data:,
 * malformed input, etc.) returns undefined so callers can treat it as "not
 * reported". The client already builds this from `origin + pathname`, but the
 * provider re-runs it on whatever arrives over the wire — never trust the
 * client to have stripped the sensitive parts.
 *
 * @param raw The raw URL string reported by the client.
 * @returns The sanitised "origin + path" URL, or undefined when the input is
 *          missing or not a usable http(s) URL.
 */
export const sanitisePageUrl = (
	raw: string | undefined | null,
): string | undefined => {
	if (!raw || typeof raw !== "string") {
		return undefined;
	}

	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		return undefined;
	}

	if (url.protocol !== "http:" && url.protocol !== "https:") {
		return undefined;
	}

	// Strip everything that could carry credentials or per-request secrets.
	url.search = "";
	url.hash = "";
	url.username = "";
	url.password = "";

	return url.toString();
};
