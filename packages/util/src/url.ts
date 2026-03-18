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
export const getURLProtocol = (url: URL) => {
	// ipv4
	if (url.hostname.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/)) {
		return "http";
	}
	// ipv6
	if (
		url.hostname.match(
			/(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))/,
		)
	) {
		return "http";
	}
	return "https";
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

export const domainIsLocalhost = (domain: string) =>
	domain === "localhost" || domain === "127.0.0.1";

// Accepts plain domains like "example.com" as well as simple wildcard patterns:
// - "*"               → allow all
// - "*.example.com"   → any subdomain of example.com (not example.com itself)
// - "*example*"       → glob-style match anywhere within the hostname
// - "localhost"       → allowed
// This does NOT accept full regex; only '*' is supported as a wildcard.
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
 * @param domain The domain to generate suffix candidates for
 * @returns Array of domain suffix candidates, from most specific to least specific (excluding TLD)
 */
export const buildDomainSuffixCandidates = (domain: string): string[] => {
	const candidates: string[] = [];
	let current = domain;
	while (current.length > 0) {
		// Only add if there's at least one dot (i.e., not just a TLD)
		if (current.includes(".")) {
			candidates.push(current);
		}
		const dotIndex = current.indexOf(".");
		if (dotIndex === -1) {
			break;
		}
		current = current.substring(dotIndex + 1);
	}
	return candidates;
};
