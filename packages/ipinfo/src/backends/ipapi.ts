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

import type { Logger } from "@prosopo/logger";
import type {
	IPApiResponse,
	IPInfoResponse,
	IPInfoResult,
} from "@prosopo/types";

/**
 * Default per-lookup budget. Short on purpose: an IP lookup sits in the request
 * path, so a slow backend must not hold up the decision that depends on it.
 */
export const DEFAULT_TIMEOUT_MS = 700;

/** The subset of global fetch this backend uses. Injected so tests need no network. */
export type FetchFn = (
	url: string,
	init: RequestInit,
) => Promise<globalThis.Response>;

export interface IpapiBackendConfig {
	baseUrl: string;
	apiKey?: string;
	logger?: Logger;
	/** Overridden in tests; defaults to the global fetch. */
	fetch?: FetchFn;
	/** Overridden in tests and tunable in deployment; defaults to DEFAULT_TIMEOUT_MS. */
	timeoutMs?: number;
}

/**
 * Parse an upstream abuser score, which arrives as a string like "0.0012 (Low)".
 *
 * The field is declared required by the response type but is not guaranteed by
 * the wire: it comes from `response.json()`, which is cast, not validated. A
 * missing value used to throw, and the throw was caught far above as a generic
 * "Network or parsing error" — discarding an otherwise complete and successful
 * lookup over one absent score.
 *
 * Returns `undefined` — not 0 — when the field is absent or unparseable. The
 * scale is 0..1 with 0 meaning "clean" (see `abuserScoreThreshold`, declared
 * `{min: 0, max: 1}`), so a literal 0 would assert cleanliness we have not
 * established. `undefined` says "unknown" instead, and the one consumer
 * (checkTrafficFilter) already resolves it with `?? 0`, so the effective
 * blocking behaviour is unchanged while the distinction stays available.
 *
 * Fail-closed alternatives were rejected: 1 turns any upstream formatting
 * change into a silent max-severity block indistinguishable from a genuine
 * 1.0, and throwing reintroduces exactly the bug above — a cosmetic sub-field
 * collapsing a good lookup into a total failure.
 */
export const parseAbuserScore = (
	score: string | undefined,
): number | undefined => {
	const head = score?.split(" ")[0];
	if (!head) {
		return undefined;
	}
	const parsed = Number.parseFloat(head);
	return Number.isNaN(parsed) ? undefined : parsed;
};

export class IpapiBackend {
	private config: IpapiBackendConfig;

	constructor(config: IpapiBackendConfig) {
		this.config = config;
	}

	isAvailable(): boolean {
		return Boolean(this.config.baseUrl);
	}

	private get timeoutMs(): number {
		return this.config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	}

	async lookup(ip: string): Promise<IPInfoResponse> {
		try {
			if (!ip || typeof ip !== "string") {
				return {
					isValid: false,
					error: "Invalid IP address provided",
					ip: ip || "undefined",
				};
			}

			const body: { q: string; key?: string } = { q: ip };
			if (this.config.apiKey) {
				body.key = this.config.apiKey;
			}

			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

			try {
				const doFetch: FetchFn = this.config.fetch ?? globalThis.fetch;
				const response = await doFetch(this.config.baseUrl, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
					},
					body: JSON.stringify(body),
					signal: controller.signal,
				});

				clearTimeout(timeoutId);

				if (!response.ok) {
					return {
						isValid: false,
						error: `API request failed with status ${response.status}: ${response.statusText}`,
						ip,
					};
				}

				const data: IPApiResponse = (await response.json()) as IPApiResponse;

				if (data.is_bogon) {
					return {
						isValid: false,
						error: "IP address is bogon (non-routable)",
						ip,
					};
				}

				const result: IPInfoResult = {
					ip: data.ip,
					isValid: true,

					isVPN: data.is_vpn,
					isTor: data.is_tor,
					isProxy: data.is_proxy,
					isDatacenter: data.is_datacenter,
					isAbuser: data.is_abuser,
					isMobile: data.is_mobile,
					isSatellite: data.is_satellite,
					isCrawler: data.is_crawler,
					providerName: data.company?.name || data.datacenter?.datacenter,
					providerType: data.company?.type || data.asn?.type,
					asnNumber: data.asn?.asn,
					asnOrganization: data.asn?.org,
					datacenterName: data.datacenter?.datacenter,

					country: data.location?.country,
					countryCode: data.location?.country_code,
					region: data.location?.state,
					city: data.location?.city,
					latitude: data.location?.latitude,
					longitude: data.location?.longitude,
					timezone: data.location?.timezone,

					vpnService: data.vpn?.service,
					vpnType: data.vpn?.type,

					abuserScore: parseAbuserScore(data.asn?.abuser_score),
					companyAbuserScore: parseAbuserScore(data.company?.abuser_score),
				};

				return result;
			} catch (fetchError) {
				clearTimeout(timeoutId);

				if (fetchError instanceof Error && fetchError.name === "AbortError") {
					return {
						isValid: false,
						error: `Request timed out after ${this.timeoutMs}ms`,
						ip,
					};
				}

				throw fetchError;
			}
		} catch (error) {
			return {
				isValid: false,
				error: `Network or parsing error: ${error instanceof Error ? error.message : String(error)}`,
				ip,
			};
		}
	}
}
