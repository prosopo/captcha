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

import type { Logger } from "@prosopo/common";
import { Address4 } from "ip-address";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as ipComparisonModule from "../../services/ipComparison.js";
import { deepValidateIpAddress } from "../../util.js";

describe("deepValidateIpAddress", () => {
	let mockLogger: Logger;
	const compareIPsSpy = vi.spyOn(ipComparisonModule, "compareIPs");

	beforeEach(() => {
		mockLogger = {
			info: vi.fn(),
			debug: vi.fn(),
			error: vi.fn(),
			log: vi.fn(),
			warn: vi.fn(),
		} as unknown as Logger;
		vi.clearAllMocks();
	});

	it("should return valid when no IP is provided", async () => {
		const result = await deepValidateIpAddress(
			undefined,
			Address4.fromBigInt(BigInt(123456789)),
			mockLogger,
			"test-api-key",
			"test-api-url",
		);

		expect(result.isValid).toBe(true);
		expect(compareIPsSpy).not.toHaveBeenCalled();
	});

	it("should return valid when IPs match exactly", async () => {
		const ip = "192.168.1.1";
		const challengeIp = new Address4("192.168.1.1");

		const result = await deepValidateIpAddress(
			ip,
			challengeIp,
			mockLogger,
			"test-api-key",
			"test-api-url",
		);

		expect(result.isValid).toBe(true);
		expect(compareIPsSpy).not.toHaveBeenCalled();
	});

	it("should reject when distance > 1000km", async () => {
		const ip = "8.8.8.8";
		const challengeIp = new Address4("1.1.1.1");

		compareIPsSpy.mockResolvedValueOnce({
			ipsMatch: false,
			ip1: "1.1.1.1",
			ip2: "8.8.8.8",
			comparison: {
				differentProviders: true,
				differentConnectionTypes: false,
				distanceKm: 2500, // > 1000km
				anyVpnOrProxy: false,
				ip1Details: {
					provider: "Cloudflare",
					connectionType: "datacenter" as const,
					isVpnOrProxy: false,
					country: "US",
					city: "New York",
				},
				ip2Details: {
					provider: "Google",
					connectionType: "datacenter" as const,
					isVpnOrProxy: false,
					country: "AU",
					city: "Sydney",
				},
			},
		});

		const result = await deepValidateIpAddress(
			ip,
			challengeIp,
			mockLogger,
			"test-api-key",
			"test-api-url",
		);

		expect(result.isValid).toBe(false);
		expect(result.distanceKm).toBe(2500);
		expect(result.errorMessage).toContain("too far apart");
	});

	it("should allow but flag when distance <= 1000km", async () => {
		const ip = "8.8.8.8";
		const challengeIp = new Address4("1.1.1.1");

		compareIPsSpy.mockResolvedValueOnce({
			ipsMatch: false,
			ip1: "1.1.1.1",
			ip2: "8.8.8.8",
			comparison: {
				differentProviders: true,
				differentConnectionTypes: false,
				distanceKm: 500, // <= 1000km
				anyVpnOrProxy: false,
				ip1Details: {
					provider: "Cloudflare",
					connectionType: "datacenter" as const,
					isVpnOrProxy: false,
					country: "US",
					city: "New York",
				},
				ip2Details: {
					provider: "Google",
					connectionType: "datacenter" as const,
					isVpnOrProxy: false,
					country: "US",
					city: "San Francisco",
				},
			},
		});

		const result = await deepValidateIpAddress(
			ip,
			challengeIp,
			mockLogger,
			"test-api-key",
			"test-api-url",
		);

		expect(result.isValid).toBe(true);
		expect(result.shouldFlag).toBe(true);
		expect(result.distanceKm).toBe(500);
		expect(mockLogger.info).toHaveBeenCalledWith(expect.any(Function));
	});
});
