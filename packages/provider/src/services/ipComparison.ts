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

import type {
	IPComparisonResponse,
	IPConnectionType,
	IPInfoResult,
} from "@prosopo/types";
import type { IIpInfoService } from "@prosopo/types-env";
import { getDistance } from "geolib";

/**
 * Compares two IP addresses and provides detailed analysis including:
 * - Whether they match
 * - Provider differences
 * - Connection type differences
 * - Geographic distance
 * - VPN/Proxy detection
 *
 * @param ip1 - First IP address to compare
 * @param ip2 - Second IP address to compare
 * @param ipInfoService - IP info service for local lookups
 * @returns Promise resolving to comparison results or error details
 */
export async function compareIPs(
	ip1: string,
	ip2: string,
	ipInfoService: IIpInfoService,
): Promise<IPComparisonResponse> {
	try {
		if (!ip1 || !ip2 || typeof ip1 !== "string" || typeof ip2 !== "string") {
			return {
				error: "Invalid IP addresses provided",
				ip1: ip1 || "undefined",
				ip2: ip2 || "undefined",
			};
		}

		if (ip1 === ip2) {
			return {
				ipsMatch: true,
				ip1,
				ip2,
			};
		}

		const [ip1Info, ip2Info] = await Promise.all([
			ipInfoService.lookup(ip1),
			ipInfoService.lookup(ip2),
		]);

		if (!ip1Info.isValid && !ip2Info.isValid) {
			return {
				error: "Failed to lookup both IP addresses",
				ip1,
				ip2,
				ip1Error: ip1Info.error,
				ip2Error: ip2Info.error,
			};
		}

		if (!ip1Info.isValid) {
			return {
				error: "Failed to lookup first IP address",
				ip1,
				ip2,
				ip1Error: ip1Info.error,
			};
		}

		if (!ip2Info.isValid) {
			return {
				error: "Failed to lookup second IP address",
				ip1,
				ip2,
				ip2Error: ip2Info.error,
			};
		}

		const determineConnectionType = (
			ipInfo: IPInfoResult,
		): IPConnectionType => {
			if (ipInfo.isMobile) return "mobile";
			if (ipInfo.isDatacenter) return "datacenter";
			if (ipInfo.isSatellite) return "satellite";
			if (ipInfo.providerType === "isp") return "residential";

			switch (ipInfo.providerType) {
				case "hosting":
					return "datacenter";
				case "business":
				case "education":
				case "government":
				case "banking":
					return "residential";
				default:
					return "unknown";
			}
		};

		const ip1ConnectionType = determineConnectionType(ip1Info);
		const ip2ConnectionType = determineConnectionType(ip2Info);

		const differentConnectionTypes = ip1ConnectionType !== ip2ConnectionType;

		const ip1Provider =
			ip1Info.providerName || ip1Info.asnOrganization || "Unknown";
		const ip2Provider =
			ip2Info.providerName || ip2Info.asnOrganization || "Unknown";

		const differentProviders = ip1Provider !== ip2Provider;

		const ip1Coordinates =
			ip1Info.latitude !== undefined && ip1Info.longitude !== undefined
				? { latitude: ip1Info.latitude, longitude: ip1Info.longitude }
				: undefined;

		const ip2Coordinates =
			ip2Info.latitude !== undefined && ip2Info.longitude !== undefined
				? { latitude: ip2Info.latitude, longitude: ip2Info.longitude }
				: undefined;

		const distanceKm: number | undefined =
			ip1Coordinates && ip2Coordinates
				? getDistance(ip1Coordinates, ip2Coordinates) / 1000
				: undefined;

		const ip1IsVpnOrProxy = ip1Info.isVPN || ip1Info.isProxy || ip1Info.isTor;
		const ip2IsVpnOrProxy = ip2Info.isVPN || ip2Info.isProxy || ip2Info.isTor;
		const anyVpnOrProxy = ip1IsVpnOrProxy || ip2IsVpnOrProxy;

		return {
			ipsMatch: false,
			ip1,
			ip2,
			comparison: {
				differentProviders,
				differentConnectionTypes,
				distanceKm,
				anyVpnOrProxy,
				ip1Details: {
					provider: ip1Provider,
					connectionType: ip1ConnectionType,
					isVpnOrProxy: ip1IsVpnOrProxy,
					country: ip1Info.country,
					countryCode: ip1Info.countryCode,
					city: ip1Info.city,
					coordinates: ip1Coordinates,
					abuserScore: ip1Info.abuserScore,
				},
				ip2Details: {
					provider: ip2Provider,
					connectionType: ip2ConnectionType,
					isVpnOrProxy: ip2IsVpnOrProxy,
					country: ip2Info.country,
					countryCode: ip2Info.countryCode,
					city: ip2Info.city,
					coordinates: ip2Coordinates,
					abuserScore: ip2Info.abuserScore,
				},
			},
		};
	} catch (error) {
		return {
			error: `Comparison failed: ${error instanceof Error ? error.message : String(error)}`,
			ip1,
			ip2,
		};
	}
}
