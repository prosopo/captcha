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
import { compareIPs } from "../../../services/ipComparison.js";
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

describe("compareIPs", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return error for invalid IP inputs", async () => {
		const result = await compareIPs("", "8.8.8.8", "test-key", "test-url");

		expect(result).toEqual({
			error: "Invalid IP addresses provided",
			ip1: "undefined",
			ip2: "8.8.8.8",
		});

		expect(getIPInfoSpy).not.toHaveBeenCalled();
	});

	it("should return match for identical IPs", async () => {
		const result = await compareIPs(
			"8.8.8.8",
			"8.8.8.8",
			"test-key",
			"test-url",
		);

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

		const result = await compareIPs(
			"invalid1",
			"invalid2",
			"test-key",
			"test-url",
		);

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

		const result = await compareIPs(
			"invalid",
			"8.8.8.8",
			"test-key",
			"test-url",
		);

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

		const result = await compareIPs(
			"8.8.8.8",
			"invalid",
			"test-key",
			"test-url",
		);

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

		const result = await compareIPs(
			"8.8.8.8",
			"1.1.1.1",
			"test-key",
			"test-url",
		);

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
		expect("comparison" in result && result.comparison?.distanceKm).toBeCloseTo(
			11954,
			-2,
		);
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

		const result = await compareIPs(
			"8.8.8.8",
			"1.1.1.1",
			"test-key",
			"test-url",
		);

		if ("comparison" in result) {
			expect(result.comparison?.anyVpnOrProxy).toBe(true);
			expect(result.comparison?.ip1Details.isVpnOrProxy).toBe(false);
			expect(result.comparison?.ip2Details.isVpnOrProxy).toBe(true);
		}
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

		const result = await compareIPs(
			"8.8.8.8",
			"1.1.1.1",
			"test-key",
			"test-url",
		);

		if ("comparison" in result) {
			expect(result.comparison?.distanceKm).toBeUndefined();
			expect(result.comparison?.ip1Details.coordinates).toBeUndefined();
			expect(result.comparison?.ip2Details.coordinates).toBeUndefined();
		}
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

		const result = await compareIPs(
			"8.8.8.8",
			"1.1.1.1",
			"test-key",
			"test-url",
		);

		if ("comparison" in result) {
			expect(result.comparison?.distanceKm).toBeUndefined();
			expect(result.comparison?.ip1Details.coordinates).toEqual({
				latitude: 37.4056,
				longitude: -122.0775,
			});
			expect(result.comparison?.ip2Details.coordinates).toBeUndefined();
		}
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

		const result = await compareIPs(
			"8.8.8.8",
			"1.1.1.1",
			"test-key",
			"test-url",
		);

		if ("comparison" in result) {
			expect(result.comparison?.ip1Details.provider).toBe("Google LLC");
			expect(result.comparison?.ip2Details.provider).toBe("Unknown");
			expect(result.comparison?.differentProviders).toBe(true);
		}
	});

	it("should handle exceptions gracefully", async () => {
		getIPInfoSpy.mockRejectedValueOnce(new Error("Network error"));

		const result = await compareIPs(
			"8.8.8.8",
			"1.1.1.1",
			"test-key",
			"test-url",
		);

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

		await compareIPs("8.8.8.8", "1.1.1.1", "test-api-key", "test-url");

		expect(getIPInfoSpy).toHaveBeenCalledWith("8.8.8.8", "test-api-key");
		expect(getIPInfoSpy).toHaveBeenCalledWith("1.1.1.1", "test-api-key");
	});
});
