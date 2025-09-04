// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import type {
	IPApiResponse,
	IPInfoResponse,
	IPInfoResult,
} from "@prosopo/types";

/**
 * Fetches comprehensive IP information from ipapi.is including geolocation,
 * provider details, and security threat indicators
 *
 * @param ip - The IP address to lookup
 * @param apiUrl
 * @param apiKey - Optional API key for increased rate limits
 * @param includeRawResponse - Whether to include the raw API response for debugging
 * @returns Promise resolving to IP information or error details
 */
export async function getIPInfo(
	ip: string,
	apiUrl: string,
	apiKey?: string,
	includeRawResponse = false,
): Promise<IPInfoResponse> {
	try {
		// Validate IP address format
		if (!ip || typeof ip !== "string") {
			return {
				isValid: false,
				error: "Invalid IP address provided",
				ip: ip || "undefined",
			};
		}

		// Prepare API request
		const url = apiUrl;
		const body: { q: string; key?: string } = { q: ip };
		if (apiKey) {
			body.key = apiKey;
		}

		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			return {
				isValid: false,
				error: `API request failed with status ${response.status}: ${response.statusText}`,
				ip,
			};
		}

		const data: IPApiResponse = await response.json();

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

			// Threat indicators
			isVPN: data.is_vpn,
			isTor: data.is_tor,
			isProxy: data.is_proxy,
			isDatacenter: data.is_datacenter,
			isAbuser: data.is_abuser,
			isMobile: data.is_mobile,
			isSatellite: data.is_satellite,

			// Provider information
			providerName: data.company?.name || data.datacenter?.datacenter,
			providerType: data.company?.type || data.asn?.type,
			asnNumber: data.asn?.asn,
			asnOrganization: data.asn?.org,

			// Geolocation
			country: data.location?.country,
			countryCode: data.location?.country_code,
			region: data.location?.state,
			city: data.location?.city,
			latitude: data.location?.latitude,
			longitude: data.location?.longitude,
			timezone: data.location?.timezone,

			// VPN specific details
			vpnService: data.vpn?.service,
			vpnType: data.vpn?.type,

			// Risk scoring
			abuserScore: data.asn?.abuser_score,
			companyAbuserScore: data.company?.abuser_score,
		};

		// Include raw response if requested
		if (includeRawResponse) {
			result.rawResponse = data;
		}

		return result;
	} catch (error) {
		return {
			isValid: false,
			error: `Network or parsing error: ${error instanceof Error ? error.message : String(error)}`,
			ip,
		};
	}
}
