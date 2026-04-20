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

import type { Logger } from "@prosopo/common";
import type {
	IPApiResponse,
	IPInfoResponse,
	IPInfoResult,
} from "@prosopo/types";

const TIMEOUT_MS = 700;

export interface IpapiBackendConfig {
	baseUrl: string;
	apiKey?: string;
	logger?: Logger;
}

export class IpapiBackend {
	private config: IpapiBackendConfig;

	constructor(config: IpapiBackendConfig) {
		this.config = config;
	}

	isAvailable(): boolean {
		return Boolean(this.config.baseUrl);
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
			const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

			try {
				const response = await fetch(this.config.baseUrl, {
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

					country: data.location?.country,
					countryCode: data.location?.country_code,
					region: data.location?.state,
					city: data.location?.city,
					latitude: data.location?.latitude,
					longitude: data.location?.longitude,
					timezone: data.location?.timezone,

					vpnService: data.vpn?.service,
					vpnType: data.vpn?.type,

					abuserScore: Number.parseFloat(
						data.asn?.abuser_score.split(" ")[0] || "0",
					),
					companyAbuserScore: Number.parseFloat(
						data.company?.abuser_score.split(" ")[0] || "0",
					),
				};

				return result;
			} catch (fetchError) {
				clearTimeout(timeoutId);

				if (fetchError instanceof Error && fetchError.name === "AbortError") {
					return {
						isValid: false,
						error: `Request timed out after ${TIMEOUT_MS}ms`,
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
