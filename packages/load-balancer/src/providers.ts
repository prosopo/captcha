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

// Base DNS endpoint per env — the `pronode.prosopo.io` family is latency-routed
// (A/AAAA records across the pronode fleet). Clients hit this URL's `/healthz`
// once to discover which specific pronodeN the DNS layer picked, then pin
// subsequent captcha calls to that pronode so session creation and submission
// land on the same backend.
const DNS_ENDPOINT: Record<EnvironmentTypes, string> = {
	development: "http://localhost:9229",
	staging: "https://staging.pronode.prosopo.io",
	production: "https://pronode.prosopo.io",
};

// Cached, in-flight pin per environment. Keyed on `env` so the first
// caller's healthz round-trip is shared by everything that follows in the
// same browser tab. Cleared automatically if the healthz fetch rejects so
// the next caller retries instead of inheriting the rejection.
const pinPromiseCache: Map<EnvironmentTypes, Promise<string>> = new Map();

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

const resolvePinnedUrl = async (env: EnvironmentTypes): Promise<string> => {
	const base = resolveBaseUrl(env);
	// Development never has a global hostname to pin against; just use the
	// hardcoded local URL.
	if (env === "development") return base;

	const cached = pinPromiseCache.get(env);
	if (cached) return cached;

	const promise = (async () => {
		try {
			const host = await fetchPinnedHost(base);
			const parsed = new URL(base);
			parsed.hostname = host;
			return parsed.toString().replace(/\/$/, "");
		} catch {
			// Healthz unreachable / malformed — fall back to the load-balanced
			// hostname. Clients will still work, they just lose stickiness.
			return base;
		}
	})();

	pinPromiseCache.set(env, promise);
	return promise;
};

export const getRandomActiveProvider = async (
	env: EnvironmentTypes,
): Promise<RandomProvider> => {
	const url = await resolvePinnedUrl(env);
	return {
		providerAccount: "dns-routed",
		provider: { url },
	};
};

// Test-only escape hatch so tests can isolate the healthz cache between
// cases. Not exported from the package index — internal use only.
export const _resetPinCache = () => {
	pinPromiseCache.clear();
};
