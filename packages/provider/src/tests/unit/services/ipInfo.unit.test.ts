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

import type { IPApiResponse, IPInfoError } from "@prosopo/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getIPInfo } from "../../../services/ipInfo.js";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockApiResponse: IPApiResponse = {
	ip: "8.8.8.8",
	rir: "ARIN",
	is_bogon: false,
	is_mobile: false,
	is_satellite: false,
	is_crawler: false,
	is_datacenter: true,
	is_tor: false,
	is_proxy: false,
	is_vpn: false,
	is_abuser: false,
	company: {
		name: "Google LLC",
		abuser_score: "0.001 (Very Low)",
		domain: "google.com",
		type: "business",
		network: "8.8.8.0 - 8.8.8.255",
		whois: "https://api.ipapi.is/?whois=8.8.8.0",
	},
	location: {
		is_eu_member: false,
		calling_code: "1",
		currency_code: "USD",
		continent: "NA",
		country: "United States",
		country_code: "US",
		state: "California",
		city: "Mountain View",
		latitude: 37.4056,
		longitude: -122.0775,
		zip: "94043",
		timezone: "America/Los_Angeles",
		local_time: "2025-02-18T10:00:00-08:00",
		local_time_unix: 1708278000,
		is_dst: false,
	},
	asn: {
		asn: 15169,
		abuser_score: "0.001 (Very Low)",
		route: "8.8.8.0/24",
		descr: "GOOGLE, US",
		country: "us",
		active: true,
		org: "Google LLC",
		domain: "google.com",
		abuse: "abuse@google.com",
		type: "business",
		created: "2000-03-30",
		updated: "2012-02-24",
		rir: "ARIN",
		whois: "https://api.ipapi.is/?whois=AS15169",
	},
	elapsed_ms: 0.15,
};

describe("getIPInfo", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should return error for invalid IP input", async () => {
		const result = (await getIPInfo("")) as IPInfoError;

		expect(result.isValid).toBe(false);
		expect(result.error).toBe("Invalid IP address provided");
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("should return error for non-string IP input", async () => {
		// @ts-expect-error - testing invalid input
		const result = (await getIPInfo(null)) as IPInfoError;

		expect(result.isValid).toBe(false);
		expect(result.error).toBe("Invalid IP address provided");
		expect(result.ip).toBe("undefined");
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("should make correct API request without API key", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: vi.fn().mockResolvedValueOnce(mockApiResponse),
		});

		await getIPInfo("8.8.8.8");

		expect(mockFetch).toHaveBeenCalledWith("https://api.ipapi.is", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			body: JSON.stringify({ q: "8.8.8.8" }),
		});
	});

	it("should make correct API request with API key", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: vi.fn().mockResolvedValueOnce(mockApiResponse),
		});

		await getIPInfo("8.8.8.8", "test-api-key");

		expect(mockFetch).toHaveBeenCalledWith("https://api.ipapi.is", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			body: JSON.stringify({ q: "8.8.8.8", key: "test-api-key" }),
		});
	});

	it("should return error when API request fails", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: false,
			status: 500,
			statusText: "Internal Server Error",
		});

		const result = (await getIPInfo("8.8.8.8")) as IPInfoError;

		expect(result.isValid).toBe(false);
		expect(result.error).toBe(
			"API request failed with status 500: Internal Server Error",
		);
		expect(result.ip).toBe("8.8.8.8");
	});

	it("should return error for bogon IP", async () => {
		const bogonResponse = { ...mockApiResponse, is_bogon: true };
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: vi.fn().mockResolvedValueOnce(bogonResponse),
		});

		const result = (await getIPInfo("127.0.0.1")) as IPInfoError;

		expect(result.isValid).toBe(false);
		expect(result.error).toBe("IP address is bogon (non-routable)");
		expect(result.ip).toBe("127.0.0.1");
	});

	it("should return structured IP info for valid response", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: vi.fn().mockResolvedValueOnce(mockApiResponse),
		});

		const result = await getIPInfo("8.8.8.8");

		expect(result.isValid).toBe(true);
		if (result.isValid) {
			expect(result.ip).toBe("8.8.8.8");
			expect(result.isDatacenter).toBe(true);
			expect(result.isVPN).toBe(false);
			expect(result.isTor).toBe(false);
			expect(result.providerName).toBe("Google LLC");
			expect(result.country).toBe("United States");
			expect(result.countryCode).toBe("US");
			expect(result.latitude).toBe(37.4056);
			expect(result.longitude).toBe(-122.0775);
			expect(result.asnNumber).toBe(15169);
		}
	});

	it("should include raw response when requested", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: vi.fn().mockResolvedValueOnce(mockApiResponse),
		});

		const result = await getIPInfo("8.8.8.8", undefined, true);

		expect(result.isValid).toBe(true);
		if (result.isValid) {
			expect(result.rawResponse).toEqual(mockApiResponse);
		}
	});

	it("should handle VPN detection", async () => {
		const vpnResponse = {
			...mockApiResponse,
			is_vpn: true,
			vpn: {
				ip: "185.254.75.23",
				service: "MullvadVPN",
				url: "https://mullvad.net",
				type: "exit_node" as const,
				last_seen: 1708278000,
				last_seen_str: "2025-02-18T10:00:00Z",
				country_code: "se",
				city_name: "Stockholm",
				latitude: 59.3293,
				longitude: 18.0686,
			},
		};

		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: vi.fn().mockResolvedValueOnce(vpnResponse),
		});

		const result = await getIPInfo("185.254.75.23");

		expect(result.isValid).toBe(true);
		if (result.isValid) {
			expect(result.isVPN).toBe(true);
			expect(result.vpnService).toBe("MullvadVPN");
			expect(result.vpnType).toBe("exit_node");
		}
	});

	it("should handle network errors", async () => {
		mockFetch.mockRejectedValueOnce(new Error("Network error"));

		const result = (await getIPInfo("8.8.8.8")) as IPInfoError;

		expect(result.isValid).toBe(false);
		expect(result.error).toBe("Network or parsing error: Network error");
		expect(result.ip).toBe("8.8.8.8");
	});

	it("should handle JSON parsing errors", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: vi.fn().mockRejectedValueOnce(new Error("Invalid JSON")),
		});

		const result = (await getIPInfo("8.8.8.8")) as IPInfoError;

		expect(result.isValid).toBe(false);
		expect(result.error).toBe("Network or parsing error: Invalid JSON");
		expect(result.ip).toBe("8.8.8.8");
	});
});
