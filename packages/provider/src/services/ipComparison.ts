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
	IPComparisonResponse,
	IPConnectionType,
	IPInfoResult,
} from "@prosopo/types";
import { getIPInfo } from "./ipInfo.js";
import { getDistance } from 'geolib';

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
 * @param apiKey - Optional API key for ipapi.is
 * @returns Promise resolving to comparison results or error details
 */
export async function compareIPs(
	ip1: string,
	ip2: string,
	apiKey?: string,
): Promise<IPComparisonResponse> {
	try {
		// Validate inputs
		if (!ip1 || !ip2 || typeof ip1 !== "string" || typeof ip2 !== "string") {
			return {
				error: "Invalid IP addresses provided",
				ip1: ip1 || "undefined",
				ip2: ip2 || "undefined",
			};
		}

		// Check for exact match first
		if (ip1 === ip2) {
			return {
				ipsMatch: true,
				ip1,
				ip2,
			};
		}

		// Get information for both IPs
		const [ip1Info, ip2Info] = await Promise.all([
			getIPInfo(ip1, apiKey),
			getIPInfo(ip2, apiKey),
		]);

		// Check for errors in IP lookups
		if (!ip1Info.isValid && !ip2Info.isValid) {
			return {
				error: "Failed to lookup both IP addresses",
				ip1,
				ip2,
				ip1Error: (ip1Info as { isValid: false; error: string }).error,
				ip2Error: (ip2Info as { isValid: false; error: string }).error,
			};
		}

		if (!ip1Info.isValid) {
			return {
				error: "Failed to lookup first IP address",
				ip1,
				ip2,
				ip1Error: (ip1Info as { isValid: false; error: string }).error,
			};
		}

		if (!ip2Info.isValid) {
			return {
				error: "Failed to lookup second IP address",
				ip1,
				ip2,
				ip2Error: (ip2Info as { isValid: false; error: string }).error,
			};
		}

		// Determine connection types based on provider info
		const determineConnectionType = (ipInfo: IPInfoResult): IPConnectionType => {
			if (ipInfo.isMobile) return "mobile";
			if (ipInfo.isDatacenter) return "datacenter";
			if (ipInfo.isSatellite) return "satellite";
			if (ipInfo.providerType === "isp") return "residential";
			
			switch (ipInfo.providerType) {
				case "hosting": return "datacenter";
				case "business":
				case "education":
				case "government":
				case "banking": return "residential";
				default: return "unknown";
			}
		};

		const ip1ConnectionType = determineConnectionType(ip1Info);
		const ip2ConnectionType = determineConnectionType(ip2Info);

		const differentConnectionTypes = ip1ConnectionType !== ip2ConnectionType;

		// Different providers?
		const ip1Provider =
			ip1Info.providerName || ip1Info.asnOrganization || "Unknown";
		const ip2Provider =
			ip2Info.providerName || ip2Info.asnOrganization || "Unknown";

		const differentProviders = ip1Provider !== ip2Provider;


		// Coords for checking distance between ips
		let distanceKm: number | undefined;
		if (
			ip1Info.latitude !== undefined &&
			ip1Info.longitude !== undefined &&
			ip2Info.latitude !== undefined &&
			ip2Info.longitude !== undefined
		) {
			// getDistance returns meters, convert to kilometers
			const distanceMeters = getDistance(
				{ latitude: ip1Info.latitude, longitude: ip1Info.longitude },
				{ latitude: ip2Info.latitude, longitude: ip2Info.longitude },
			);
			distanceKm = distanceMeters / 1000;
		}

		const ip1IsVpnOrProxy = ip1Info.isVPN || ip1Info.isProxy || ip1Info.isTor;
		const ip2IsVpnOrProxy = ip2Info.isVPN || ip2Info.isProxy || ip2Info.isTor;
		const anyVpnOrProxy = ip1IsVpnOrProxy || ip2IsVpnOrProxy;

		// Build coordinate objects if available
		const ip1Coordinates =
			ip1Info.latitude !== undefined && ip1Info.longitude !== undefined
				? { latitude: ip1Info.latitude, longitude: ip1Info.longitude }
				: undefined;

		const ip2Coordinates =
			ip2Info.latitude !== undefined && ip2Info.longitude !== undefined
				? { latitude: ip2Info.latitude, longitude: ip2Info.longitude }
				: undefined;

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
					city: ip1Info.city,
					coordinates: ip1Coordinates,
				},
				ip2Details: {
					provider: ip2Provider,
					connectionType: ip2ConnectionType,
					isVpnOrProxy: ip2IsVpnOrProxy,
					country: ip2Info.country,
					city: ip2Info.city,
					coordinates: ip2Coordinates,
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
