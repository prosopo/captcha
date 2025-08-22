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

import type { IPInfoResponse, IPInfoResult } from "@prosopo/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	calculateDistance,
	compareIPs,
	determineConnectionType,
} from "../../../services/ipComparison.js";
import * as ipInfoModule from "../../../services/ipInfo.js";

// Mock the getIPInfo function
const getIPInfoSpy = vi.spyOn(ipInfoModule, "getIPInfo");

const createMockIPInfo = (overrides: Partial<IPInfoResult>): IPInfoResult => ({
	ip: "8.8.8.8",
	isValid: true,
	isVPN: false,
	isTor: false,
	isProxy: false,
	isDatacenter: false,
	isAbuser: false,
	isMobile: false,
	isSatellite: false,
	providerName: "Google LLC",
	providerType: "business",
	asnNumber: 15169,
	asnOrganization: "Google LLC",
	country: "United States",
	countryCode: "US",
	region: "California",
	city: "Mountain View",
	latitude: 37.4056,
	longitude: -122.0775,
	timezone: "America/Los_Angeles",
	...overrides,
});

describe("calculateDistance", () => {
	it("should calculate distance between two points correctly", () => {
		// Distance between New York and Los Angeles (approximately)
		const nyLat = 40.7128;
		const nyLon = -74.006;
		const laLat = 34.0522;
		const laLon = -118.2437;

		const distance = calculateDistance(nyLat, nyLon, laLat, laLon);

		// Should be approximately 3936 km (adjusted based on actual result)
		expect(distance).toBeCloseTo(3936, -1); // Within 10km
	});

	it("should return 0 for identical coordinates", () => {
		const distance = calculateDistance(0, 0, 0, 0);
		expect(distance).toBe(0);
	});

	it("should handle negative coordinates", () => {
		// Distance between London and Sydney
		const londonLat = 51.5074;
		const londonLon = -0.1278;
		const sydneyLat = -33.8688;
		const sydneyLon = 151.2093;

		const distance = calculateDistance(
			londonLat,
			londonLon,
			sydneyLat,
			sydneyLon,
		);

		// Should be approximately 17,000 km
		expect(distance).toBeCloseTo(17000, -2); // Within 100km
	});
});

describe("determineConnectionType", () => {
	it("should return mobile for mobile IPs", () => {
		const ipInfo = createMockIPInfo({ isMobile: true });
		expect(determineConnectionType(ipInfo)).toBe("mobile");
	});

	it("should return datacenter for datacenter IPs", () => {
		const ipInfo = createMockIPInfo({ isDatacenter: true });
		expect(determineConnectionType(ipInfo)).toBe("datacenter");
	});

	it("should return satellite for satellite IPs", () => {
		const ipInfo = createMockIPInfo({ isSatellite: true });
		expect(determineConnectionType(ipInfo)).toBe("satellite");
	});

	it("should return residential for ISP provider type", () => {
		const ipInfo = createMockIPInfo({ providerType: "isp" });
		expect(determineConnectionType(ipInfo)).toBe("residential");
	});

	it("should return datacenter for hosting provider type", () => {
		const ipInfo = createMockIPInfo({ providerType: "hosting" });
		expect(determineConnectionType(ipInfo)).toBe("datacenter");
	});

	it("should return residential for business provider type", () => {
		const ipInfo = createMockIPInfo({ providerType: "business" });
		expect(determineConnectionType(ipInfo)).toBe("residential");
	});

	it("should return residential for education provider type", () => {
		const ipInfo = createMockIPInfo({ providerType: "education" });
		expect(determineConnectionType(ipInfo)).toBe("residential");
	});

	it("should return residential for government provider type", () => {
		const ipInfo = createMockIPInfo({ providerType: "government" });
		expect(determineConnectionType(ipInfo)).toBe("residential");
	});

	it("should return residential for banking provider type", () => {
		const ipInfo = createMockIPInfo({ providerType: "banking" });
		expect(determineConnectionType(ipInfo)).toBe("residential");
	});

	it("should return unknown for undefined provider type", () => {
		const ipInfo = createMockIPInfo({ providerType: undefined });
		expect(determineConnectionType(ipInfo)).toBe("unknown");
	});

	it("should prioritize specific flags over provider type", () => {
		// Mobile should take precedence over datacenter flag
		const ipInfo = createMockIPInfo({
			isMobile: true,
			isDatacenter: true,
			providerType: "hosting",
		});
		expect(determineConnectionType(ipInfo)).toBe("mobile");
	});
});

describe("compareIPs", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return error for invalid IP inputs", async () => {
		const result = await compareIPs("", "8.8.8.8");

		expect(result).toEqual({
			error: "Invalid IP addresses provided",
			ip1: "undefined",
			ip2: "8.8.8.8",
		});

		expect(getIPInfoSpy).not.toHaveBeenCalled();
	});

	it("should return match for identical IPs", async () => {
		const result = await compareIPs("8.8.8.8", "8.8.8.8");

		expect(result).toEqual({
			ipsMatch: true,
			ip1: "8.8.8.8",
			ip2: "8.8.8.8",
		});

		expect(getIPInfoSpy).not.toHaveBeenCalled();
	});

	it("should return error when both IP lookups fail", async () => {
		const errorResponse = {
			isValid: false,
			error: "Invalid IP",
			ip: "invalid",
		} as const;
		getIPInfoSpy
			.mockResolvedValueOnce(errorResponse)
			.mockResolvedValueOnce(errorResponse);

		const result = await compareIPs("invalid1", "invalid2");

		expect(result).toEqual({
			error: "Failed to lookup both IP addresses",
			ip1: "invalid1",
			ip2: "invalid2",
			ip1Error: "Invalid IP",
			ip2Error: "Invalid IP",
		});
	});

	it("should return error when first IP lookup fails", async () => {
		const errorResponse = {
			isValid: false,
			error: "Invalid IP",
			ip: "invalid",
		} as const;
		const validResponse = createMockIPInfo({ ip: "8.8.8.8" }) as IPInfoResponse;

		getIPInfoSpy
			.mockResolvedValueOnce(errorResponse)
			.mockResolvedValueOnce(validResponse);

		const result = await compareIPs("invalid", "8.8.8.8");

		expect(result).toEqual({
			error: "Failed to lookup first IP address",
			ip1: "invalid",
			ip2: "8.8.8.8",
			ip1Error: "Invalid IP",
		});
	});

	it("should return error when second IP lookup fails", async () => {
		const validResponse = createMockIPInfo({ ip: "8.8.8.8" }) as IPInfoResponse;
		const errorResponse = {
			isValid: false,
			error: "Invalid IP",
			ip: "invalid",
		} as const;

		getIPInfoSpy
			.mockResolvedValueOnce(validResponse)
			.mockResolvedValueOnce(errorResponse);

		const result = await compareIPs("8.8.8.8", "invalid");

		expect(result).toEqual({
			error: "Failed to lookup second IP address",
			ip1: "8.8.8.8",
			ip2: "invalid",
			ip2Error: "Invalid IP",
		});
	});

	it("should return detailed comparison for different IPs", async () => {
		const ip1Info = createMockIPInfo({
			ip: "8.8.8.8",
			providerName: "Google LLC",
			isDatacenter: true,
			country: "United States",
			city: "Mountain View",
			latitude: 37.4056,
			longitude: -122.0775,
		}) as IPInfoResponse;

		const ip2Info = createMockIPInfo({
			ip: "1.1.1.1",
			providerName: "Cloudflare Inc",
			isDatacenter: true,
			country: "Australia",
			city: "Sydney",
			latitude: -33.8688,
			longitude: 151.2093,
		}) as IPInfoResponse;

		getIPInfoSpy.mockResolvedValueOnce(ip1Info).mockResolvedValueOnce(ip2Info);

		const result = await compareIPs("8.8.8.8", "1.1.1.1");

		expect(result).toMatchObject({
			ipsMatch: false,
			ip1: "8.8.8.8",
			ip2: "1.1.1.1",
			comparison: {
				differentProviders: true,
				differentConnectionTypes: false, // Both datacenter
				anyVpnOrProxy: false,
				ip1Details: {
					provider: "Google LLC",
					connectionType: "datacenter",
					isVpnOrProxy: false,
					country: "United States",
					city: "Mountain View",
					coordinates: {
						latitude: 37.4056,
						longitude: -122.0775,
					},
				},
				ip2Details: {
					provider: "Cloudflare Inc",
					connectionType: "datacenter",
					isVpnOrProxy: false,
					country: "Australia",
					city: "Sydney",
					coordinates: {
						latitude: -33.8688,
						longitude: 151.2093,
					},
				},
			},
		});

		// Distance should be calculated (adjusted for actual distance)
		expect(result.comparison?.distanceKm).toBeCloseTo(11954, -2);
	});

	it("should detect VPN/proxy usage", async () => {
		const ip1Info = createMockIPInfo({
			ip: "8.8.8.8",
			isVPN: false,
			isProxy: false,
			isTor: false,
		}) as IPInfoResponse;

		const ip2Info = createMockIPInfo({
			ip: "1.1.1.1",
			isVPN: true,
			isProxy: false,
			isTor: false,
		}) as IPInfoResponse;

		getIPInfoSpy.mockResolvedValueOnce(ip1Info).mockResolvedValueOnce(ip2Info);

		const result = await compareIPs("8.8.8.8", "1.1.1.1");

		expect(result.comparison?.anyVpnOrProxy).toBe(true);
		expect(result.comparison?.ip1Details.isVpnOrProxy).toBe(false);
		expect(result.comparison?.ip2Details.isVpnOrProxy).toBe(true);
	});

	it("should handle missing coordinates gracefully", async () => {
		const ip1Info = createMockIPInfo({
			ip: "8.8.8.8",
			latitude: undefined,
			longitude: undefined,
		}) as IPInfoResponse;

		const ip2Info = createMockIPInfo({
			ip: "1.1.1.1",
			latitude: undefined,
			longitude: undefined,
		}) as IPInfoResponse;

		getIPInfoSpy.mockResolvedValueOnce(ip1Info).mockResolvedValueOnce(ip2Info);

		const result = await compareIPs("8.8.8.8", "1.1.1.1");

		expect(result.comparison?.distanceKm).toBeUndefined();
		expect(result.comparison?.ip1Details.coordinates).toBeUndefined();
		expect(result.comparison?.ip2Details.coordinates).toBeUndefined();
	});

	it("should handle partial coordinate data", async () => {
		const ip1Info = createMockIPInfo({
			ip: "8.8.8.8",
			latitude: 37.4056,
			longitude: -122.0775,
		}) as IPInfoResponse;

		const ip2Info = createMockIPInfo({
			ip: "1.1.1.1",
			latitude: undefined,
			longitude: undefined,
		}) as IPInfoResponse;

		getIPInfoSpy.mockResolvedValueOnce(ip1Info).mockResolvedValueOnce(ip2Info);

		const result = await compareIPs("8.8.8.8", "1.1.1.1");

		expect(result.comparison?.distanceKm).toBeUndefined();
		expect(result.comparison?.ip1Details.coordinates).toEqual({
			latitude: 37.4056,
			longitude: -122.0775,
		});
		expect(result.comparison?.ip2Details.coordinates).toBeUndefined();
	});

	it("should handle provider fallback logic", async () => {
		const ip1Info = createMockIPInfo({
			ip: "8.8.8.8",
			providerName: undefined,
			asnOrganization: "Google LLC",
		}) as IPInfoResponse;

		const ip2Info = createMockIPInfo({
			ip: "1.1.1.1",
			providerName: undefined,
			asnOrganization: undefined,
		}) as IPInfoResponse;

		getIPInfoSpy.mockResolvedValueOnce(ip1Info).mockResolvedValueOnce(ip2Info);

		const result = await compareIPs("8.8.8.8", "1.1.1.1");

		expect(result.comparison?.ip1Details.provider).toBe("Google LLC");
		expect(result.comparison?.ip2Details.provider).toBe("Unknown");
		expect(result.comparison?.differentProviders).toBe(true);
	});

	it("should handle exceptions gracefully", async () => {
		getIPInfoSpy.mockRejectedValueOnce(new Error("Network error"));

		const result = await compareIPs("8.8.8.8", "1.1.1.1");

		expect(result).toEqual({
			error: "Comparison failed: Network error",
			ip1: "8.8.8.8",
			ip2: "1.1.1.1",
		});
	});

	it("should pass API key to getIPInfo", async () => {
		const ip1Info = createMockIPInfo({ ip: "8.8.8.8" }) as IPInfoResponse;
		const ip2Info = createMockIPInfo({ ip: "1.1.1.1" }) as IPInfoResponse;

		getIPInfoSpy.mockResolvedValueOnce(ip1Info).mockResolvedValueOnce(ip2Info);

		await compareIPs("8.8.8.8", "1.1.1.1", "test-api-key");

		expect(getIPInfoSpy).toHaveBeenCalledWith("8.8.8.8", "test-api-key");
		expect(getIPInfoSpy).toHaveBeenCalledWith("1.1.1.1", "test-api-key");
	});
});
