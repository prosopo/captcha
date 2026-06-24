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

/**
 * Extracts the domain from an email address or returns the input if it's already a domain.
 * Handles various input formats:
 * - "user@domain.com" → "domain.com"
 * - "@domain.com" → "domain.com"
 * - "user@sub@domain.com" → "domain.com" (takes last part after @)
 * - "domain.com" → "domain.com" (passthrough)
 * - "" or whitespace → null
 *
 * @param emailOrDomain - An email address or domain string
 * @returns The extracted domain in lowercase and trimmed, or null if empty/invalid
 */
export function extractDomainFromEmail(emailOrDomain: string): string | null {
	// Trim whitespace
	const trimmed = emailOrDomain.trim();
	if (!trimmed) {
		return null;
	}

	let domain: string;
	if (trimmed.includes("@")) {
		// Handle user@domain.com or @domain.com
		const parts = trimmed.split("@");
		// Take the last part after @ (handles multiple @ signs)
		domain = parts[parts.length - 1] || "";
	} else {
		// Handle domain.com directly
		domain = trimmed;
	}

	// Validate domain is not empty
	const normalizedDomain = domain.toLowerCase().trim();
	if (!normalizedDomain) {
		return null;
	}

	return normalizedDomain;
}
