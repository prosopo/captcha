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

export type JwksFetch = (url: string, init?: RequestInit) => Promise<Response>;

const DIRECTORY_PATH = "/.well-known/http-message-signatures-directory";
const DEFAULT_TTL_MS = 60 * 60 * 1000;
// The signer chooses the cache-control header, so it does not get to pin a
// key set in memory indefinitely.
const MAX_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 3000;
// A key directory holds a handful of JWKs; anything bigger is not one.
const MAX_BODY_BYTES = 64 * 1024;
// Every unsigned-but-headered request can name a fresh signer URL, so the
// cache must not grow with attacker input.
const MAX_CACHE_ENTRIES = 1000;

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
	// Abort the directory fetch after this long. In milliseconds.
	timeoutMs?: number;
	// Permit http:// and local signer hosts. Only for tests and local
	// development, where the JWKS is served from a throwaway localhost origin.
	allowLocalSigners?: boolean;
};

const isIpLiteral = (hostname: string): boolean =>
	hostname.startsWith("[") || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);

// The signer URL is taken from a request header, so without this any client
// could make the provider fetch from inside its own network. Signers are
// public HTTPS origins with DNS names. Names that resolve to private
// addresses are not caught here.
const assertFetchableSigner = (url: URL): void => {
	if (url.protocol !== "https:") {
		throw new Error(`signer must be https: ${url.origin}`);
	}
	const hostname = url.hostname.toLowerCase();
	if (
		isIpLiteral(hostname) ||
		hostname === "localhost" ||
		hostname.endsWith(".localhost") ||
		!hostname.includes(".")
	) {
		throw new Error(`signer host not allowed: ${hostname}`);
	}
};

const readCappedText = async (response: Response): Promise<string> => {
	const declared = Number(response.headers.get("content-length"));
	if (declared > MAX_BODY_BYTES) {
		throw new Error(`JWKS body too large: ${declared} bytes`);
	}
	if (!response.body) return "";
	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		total += value.byteLength;
		if (total > MAX_BODY_BYTES) {
			await reader.cancel();
			throw new Error(`JWKS body exceeds ${MAX_BODY_BYTES} bytes`);
		}
		chunks.push(value);
	}
	const bytes = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return new TextDecoder().decode(bytes);
};

const remember = (signerUrl: string, entry: CacheEntry): void => {
	cache.delete(signerUrl);
	if (cache.size >= MAX_CACHE_ENTRIES) {
		const now = Date.now();
		for (const [key, value] of cache) {
			if (value.expiresAt <= now) cache.delete(key);
		}
	}
	while (cache.size >= MAX_CACHE_ENTRIES) {
		const oldest = cache.keys().next();
		if (oldest.done) break;
		cache.delete(oldest.value);
	}
	cache.set(signerUrl, entry);
};

export const resolveJwksFromSignatureAgent = async (
	signerUrl: string,
	options: JwksResolverOptions = {},
): Promise<Jwk[]> => {
	const now = Date.now();
	const cached = cache.get(signerUrl);
	if (cached && cached.expiresAt > now) return cached.keys;

	const fetchImpl = options.fetch ?? fetch;
	const directoryUrl = new URL(DIRECTORY_PATH, `${signerUrl}/`);
	if (!options.allowLocalSigners) assertFetchableSigner(directoryUrl);
	const response = await fetchImpl(directoryUrl.toString(), {
		signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
		redirect: "error",
	});
	if (!response.ok) {
		throw new Error(`JWKS fetch ${response.status} at ${directoryUrl}`);
	}

	const body = JSON.parse(await readCappedText(response)) as { keys?: Jwk[] };
	const keys = Array.isArray(body.keys) ? body.keys : [];

	const ttl = Math.min(
		options.ttlMs ??
			parseMaxAge(response.headers.get("cache-control")) ??
			DEFAULT_TTL_MS,
		MAX_TTL_MS,
	);

	remember(signerUrl, { keys, expiresAt: now + ttl });
	return keys;
};

export const jwksCacheSize = (): number => cache.size;

export const clearJwksCache = (): void => {
	cache.clear();
};
