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

// Every Signature-Agent URL points to a well-known JWKS directory. Fetch on
// first use, cache for the duration the origin recommends (or a 1 h default),
// and refresh on cache miss / expiry. Not persisted — an idle process
// forgets, which is fine: the fetch cost is one round-trip per hour per
// signer, and stale keys are worse than an extra fetch.

export type Jwk = {
	kty: string;
	kid?: string;
	crv?: string;
	x?: string;
	alg?: string;
	use?: string;
	// Passthrough for anything else the directory adds — Cloudflare's verifier
	// consumes JsonWebKey, which is a broad type.
	[key: string]: unknown;
};

export type JwksFetch = (url: string) => Promise<Response>;

const DIRECTORY_PATH = "/.well-known/http-message-signatures-directory";
const DEFAULT_TTL_MS = 60 * 60 * 1000;

type CacheEntry = { keys: Jwk[]; expiresAt: number };

const cache = new Map<string, CacheEntry>();

const parseMaxAge = (header: string | null): number | null => {
	if (!header) return null;
	const match = /max-age=(\d+)/i.exec(header);
	return match?.[1] ? Number(match[1]) * 1000 : null;
};

export type JwksResolverOptions = {
	// Injectable for tests. Defaults to the global fetch.
	fetch?: JwksFetch;
	// Overrides the cache-control / default TTL. In milliseconds.
	ttlMs?: number;
};

export const resolveJwksFromSignatureAgent = async (
	signerUrl: string,
	options: JwksResolverOptions = {},
): Promise<Jwk[]> => {
	const now = Date.now();
	const cached = cache.get(signerUrl);
	if (cached && cached.expiresAt > now) return cached.keys;

	const fetchImpl = options.fetch ?? fetch;
	const directoryUrl = new URL(DIRECTORY_PATH, `${signerUrl}/`).toString();
	const response = await fetchImpl(directoryUrl);
	if (!response.ok) {
		throw new Error(
			`JWKS fetch ${response.status} at ${directoryUrl}`,
		);
	}

	const body = (await response.json()) as { keys?: Jwk[] };
	const keys = Array.isArray(body.keys) ? body.keys : [];

	const ttl =
		options.ttlMs ??
		parseMaxAge(response.headers.get("cache-control")) ??
		DEFAULT_TTL_MS;

	cache.set(signerUrl, { keys, expiresAt: now + ttl });
	return keys;
};

// Test / long-running-process escape hatch — resets the in-memory cache so
// tests don't leak state between suites and operators can force a refresh
// after publishing a rotated key.
export const clearJwksCache = (): void => {
	cache.clear();
};
