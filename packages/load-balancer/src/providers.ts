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

import type { EnvironmentTypes, RandomProvider } from "@prosopo/types";
import {
	type HardcodedProvider,
	type IpMode,
	loadBalancer,
} from "./balancer.js";

// Base DNS endpoint per env — the `pronode.prosopo.io` family is latency-routed
// (A/AAAA records across the pronode fleet). Clients hit this URL's `/healthz`
// once to discover which specific pronodeN the DNS layer picked, then pin
// subsequent captcha calls to that pronode so session creation and submission
// land on the same backend.
const DNS_ENDPOINT: Record<EnvironmentTypes, string> = {
	development: "https://localhost:9229",
	staging: "https://staging.pronode.prosopo.io",
	production: "https://pronode.prosopo.io",
};

// Apply the `ipv4.` / `ipv6.` DNS label to a hostname. The single-stack
// sub-zones only resolve to A or AAAA records respectively, so this pins the
// network path before TLS negotiation. Ansible provisions the matching certs
// for both `ipv4.{global}` and `ipv4.pronodeN.{global}`.
const withIpModeLabel = (hostname: string, ipMode?: IpMode): string =>
	ipMode ? `${ipMode}.${hostname}` : hostname;

const applyIpModeToUrl = (url: string, ipMode?: IpMode): string => {
	if (!ipMode) return url;
	try {
		const parsed = new URL(url);
		parsed.hostname = withIpModeLabel(parsed.hostname, ipMode);
		return parsed.toString().replace(/\/$/, "");
	} catch {
		return url;
	}
};

// Cached, in-flight pin per (env, ipMode). Keyed so dual-stack and single-stack
// callers maintain separate stickiness — they hit different /healthz endpoints
// and shouldn't share each other's resolution.
type CacheKey = `${EnvironmentTypes}|${IpMode | "dual"}`;
const cacheKey = (env: EnvironmentTypes, ipMode?: IpMode): CacheKey =>
	`${env}|${ipMode ?? "dual"}`;
const pinPromiseCache: Map<CacheKey, Promise<string>> = new Map();

const fetchPinnedHost = async (baseUrl: string): Promise<string> => {
	const res = await fetch(`${baseUrl}/healthz`, {
		method: "GET",
		cache: "no-store",
		credentials: "omit",
	});
	if (!res.ok) {
		throw new Error(`healthz responded with ${res.status}`);
	}
	const body = (await res.json()) as { host?: unknown };
	if (typeof body.host !== "string" || body.host.length === 0) {
		throw new Error("healthz response missing host field");
	}
	return body.host;
};

const resolveBaseUrl = (env: EnvironmentTypes): string =>
	DNS_ENDPOINT[env] ?? DNS_ENDPOINT.development;

const resolvePinnedUrl = async (
	env: EnvironmentTypes,
	ipMode?: IpMode,
): Promise<string> => {
	// The base for /healthz already carries the ipv4./ipv6. label when one is
	// requested, so DNS keeps the discovery request on the same single-stack
	// path as the captcha calls that follow.
	const base = applyIpModeToUrl(resolveBaseUrl(env), ipMode);
	// Development has no global hostname to /healthz against; use the
	// hardcoded local URL.
	if (env === "development") return base;

	const key = cacheKey(env, ipMode);
	const cached = pinPromiseCache.get(key);
	if (cached) return cached;

	const promise = (async () => {
		try {
			const host = await fetchPinnedHost(base);
			const parsed = new URL(base);
			// /healthz returns the bare pronodeN.prosopo.io (env.config.host).
			// Re-apply the ipMode label so the per-pronode URL stays on the same
			// single-stack sub-zone (`ipv4.pronode4.prosopo.io`).
			parsed.hostname = withIpModeLabel(host, ipMode);
			return parsed.toString().replace(/\/$/, "");
		} catch {
			// Healthz unreachable / malformed — fall back to the load-balanced
			// hostname (with the ipMode label still applied). Clients still
			// work, they just lose per-pronode stickiness.
			return base;
		}
	})();

	pinPromiseCache.set(key, promise);
	return promise;
};

// Cached, in-flight provider-list load per env. The list rarely changes, so a
// single fetch is shared across callers rather than re-fetching the
// provider-list JSON on every verify-forward decision.
const providerListPromiseCache: Map<
	EnvironmentTypes,
	Promise<HardcodedProvider[]>
> = new Map();

/**
 * Returns the full (cached) list of active providers for an environment.
 * Used to look up a provider by url/address, e.g. to find the provider that
 * issued a token before forwarding a verification request to it.
 */
export const getProviders = async (
	env: EnvironmentTypes,
): Promise<HardcodedProvider[]> => {
	const cached = providerListPromiseCache.get(env);
	if (cached) return cached;

	const promise = loadBalancer(env).catch((err) => {
		// Don't cache failures — a transient fetch error shouldn't poison the
		// cache for the lifetime of the process.
		providerListPromiseCache.delete(env);
		throw err;
	});
	providerListPromiseCache.set(env, promise);
	return promise;
};

export const getRandomActiveProvider = async (
	env: EnvironmentTypes,
	ipMode?: IpMode,
): Promise<RandomProvider> => {
	const url = await resolvePinnedUrl(env, ipMode);
	return {
		providerAccount: "dns-routed",
		provider: { url },
	};
};

// Compare two provider URLs ignoring a trailing slash so a stored "failed" URL
// still matches its list entry regardless of formatting.
const sameProviderUrl = (a: string, b: string): boolean =>
	a.replace(/\/$/, "") === b.replace(/\/$/, "");

// Weighted random pick — providers advertise a capacity weight (1-100), so
// fallback traffic is spread in proportion to capacity rather than uniformly.
// Returns undefined only for an empty list (callers guard against that).
const pickWeightedProvider = (
	providers: HardcodedProvider[],
	random: () => number,
): HardcodedProvider | undefined => {
	const totalWeight = providers.reduce((sum, p) => sum + p.weight, 0);
	let threshold = random() * totalWeight;
	let chosen: HardcodedProvider | undefined;
	for (const provider of providers) {
		chosen = provider;
		threshold -= provider.weight;
		if (threshold < 0) break;
	}
	return chosen;
};

/**
 * Pick a random provider directly from the provider list, bypassing the
 * DNS-routed endpoint. This is the error-fallback path: once a provider has
 * errored, retrying it re-hits the same (possibly-down) endpoint, and a fleet
 * of widgets doing that in a tight loop can accidentally DDoS the provider — so
 * instead we spread the retry across the fleet by choosing a random provider
 * from the list. `excludeUrl` (the provider that just failed) is dropped from
 * the pool when other providers remain. In development the list holds only the
 * single local provider, so this naturally degrades to retrying that provider.
 * `random` is injectable so tests can make the pick deterministic.
 */
export const getRandomProviderFromList = async (
	env: EnvironmentTypes,
	ipMode?: IpMode,
	excludeUrl?: string,
	random: () => number = Math.random,
): Promise<RandomProvider> => {
	const providers = await getProviders(env);
	if (providers.length === 0) {
		// Nothing to choose from — fall back to the DNS-routed endpoint.
		return getRandomActiveProvider(env, ipMode);
	}

	// Only exclude the failed provider when at least one other remains, so we
	// never end up with an empty pool (e.g. a single-provider environment).
	const eligible =
		excludeUrl && providers.length > 1
			? providers.filter(
					(p) => !sameProviderUrl(applyIpModeToUrl(p.url, ipMode), excludeUrl),
				)
			: providers;
	const pool = eligible.length > 0 ? eligible : providers;

	const chosen = pickWeightedProvider(pool, random);
	if (!chosen) {
		return getRandomActiveProvider(env, ipMode);
	}
	return {
		providerAccount: chosen.address,
		provider: { url: applyIpModeToUrl(chosen.url, ipMode) },
	};
};

// Test-only escape hatch so tests can isolate the healthz cache between
// cases. Not exported from the package index — internal use only.
export const _resetPinCache = () => {
	pinPromiseCache.clear();
};

// Test-only escape hatch to isolate the provider-list cache between cases.
// Not exported from the package index — internal use only.
export const _resetProviderListCache = () => {
	providerListPromiseCache.clear();
};
