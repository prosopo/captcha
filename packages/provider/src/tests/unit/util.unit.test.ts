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

import { ProsopoContractError, ProsopoEnvError } from "@prosopo/common";
import { ScheduledTaskNames, ScheduledTaskStatus } from "@prosopo/types";
import type { IProviderDatabase } from "@prosopo/types-database";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	checkIfTaskIsRunning,
	encodeStringAddress,
	getIPAddress,
	getIPAddressFromBigInt,
	shuffleArray,
} from "../../util.js";

describe("encodeStringAddress", () => {
	it("should encode a valid hex address", () => {
		// Use a valid Polkadot address format
		const hexAddress =
			"0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d";
		const result = encodeStringAddress(hexAddress);
		expect(result).toBeDefined();
		expect(typeof result).toBe("string");
	});

	it("should encode a valid base58 address", () => {
		const base58Address = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
		const result = encodeStringAddress(base58Address);
		expect(result).toBeDefined();
		expect(typeof result).toBe("string");
	});

	it("should throw ProsopoContractError for invalid address", () => {
		const invalidAddress = "invalid-address";
		expect(() => encodeStringAddress(invalidAddress)).toThrow(
			ProsopoContractError,
		);
		expect(() => encodeStringAddress(invalidAddress)).toThrow(
			"CONTRACT.INVALID_ADDRESS",
		);
	});
});

describe("shuffleArray", () => {
	it("should return an array of the same length", () => {
		const original = [1, 2, 3, 4, 5];
		const result = shuffleArray([...original]);
		expect(result).toHaveLength(original.length);
	});

	it("should contain the same elements", () => {
		const original = [1, 2, 3, 4, 5];
		const result = shuffleArray([...original]);
		expect(result.sort()).toEqual(original.sort());
	});

	it("should handle empty array", () => {
		const original: number[] = [];
		const result = shuffleArray([...original]);
		expect(result).toEqual([]);
	});

	it("should handle single element array", () => {
		const original = [42];
		const result = shuffleArray([...original]);
		expect(result).toEqual([42]);
	});

	it("should handle array with duplicate elements", () => {
		const original = [1, 1, 2, 2, 3];
		const result = shuffleArray([...original]);
		expect(result.sort()).toEqual(original.sort());
		expect(result).toHaveLength(5);
	});

	it("should modify the original array in place", () => {
		const original = [1, 2, 3, 4, 5];
		const originalCopy = [...original];
		shuffleArray(original);
		// The array should be shuffled (though there's a tiny chance it's the same)
		expect(original).toHaveLength(originalCopy.length);
		expect(original.sort()).toEqual(originalCopy.sort());
	});
});

describe("checkIfTaskIsRunning", () => {
	let mockDb: IProviderDatabase;

	beforeEach(() => {
		mockDb = {
			getLastScheduledTaskStatus: vi.fn(),
			getScheduledTaskStatus: vi.fn(),
		} as unknown as IProviderDatabase;
	});

	it("should return false when no running task exists", async () => {
		vi.mocked(mockDb.getLastScheduledTaskStatus).mockResolvedValue(null);

		const result = await checkIfTaskIsRunning(
			ScheduledTaskNames.StoreCommitmentsExternal,
			mockDb,
		);

		expect(result).toBe(false);
		expect(mockDb.getLastScheduledTaskStatus).toHaveBeenCalledWith(
			ScheduledTaskNames.StoreCommitmentsExternal,
			ScheduledTaskStatus.Running,
		);
	});

	it("should return false when running task is older than 2 minutes", async () => {
		const oldTask = {
			_id: "task-id",
			datetime: new Date(Date.now() - 1000 * 60 * 3), // 3 minutes ago
		};

		vi.mocked(mockDb.getLastScheduledTaskStatus).mockResolvedValue(oldTask);

		const result = await checkIfTaskIsRunning(
			ScheduledTaskNames.StoreCommitmentsExternal,
			mockDb,
		);

		expect(result).toBe(false);
		expect(mockDb.getLastScheduledTaskStatus).toHaveBeenCalledTimes(1);
		expect(mockDb.getScheduledTaskStatus).not.toHaveBeenCalled();
	});

	it("should return true when running task exists and is not completed", async () => {
		const recentTask = {
			_id: "task-id",
			datetime: new Date(Date.now() - 1000 * 60), // 1 minute ago
		};

		vi.mocked(mockDb.getLastScheduledTaskStatus).mockResolvedValue(recentTask);
		vi.mocked(mockDb.getScheduledTaskStatus).mockResolvedValue(null); // Not completed

		const result = await checkIfTaskIsRunning(
			ScheduledTaskNames.StoreCommitmentsExternal,
			mockDb,
		);

		expect(result).toBe(true);
		expect(mockDb.getScheduledTaskStatus).toHaveBeenCalledWith(
			recentTask._id,
			ScheduledTaskStatus.Completed,
		);
	});

	it("should return false when running task exists and is completed", async () => {
		const recentTask = {
			_id: "task-id",
			datetime: new Date(Date.now() - 1000 * 30), // 30 seconds ago
		};
		const completedTask = {
			_id: "completed-id",
			status: ScheduledTaskStatus.Completed,
		};

		vi.mocked(mockDb.getLastScheduledTaskStatus).mockResolvedValue(recentTask);
		vi.mocked(mockDb.getScheduledTaskStatus).mockResolvedValue(completedTask);

		const result = await checkIfTaskIsRunning(
			ScheduledTaskNames.StoreCommitmentsExternal,
			mockDb,
		);

		expect(result).toBe(false);
		expect(mockDb.getScheduledTaskStatus).toHaveBeenCalledWith(
			recentTask._id,
			ScheduledTaskStatus.Completed,
		);
	});
});

describe("getIPAddress", () => {
	it("should parse valid IPv4 address", () => {
		const ipv4 = "192.168.1.1";
		const result = getIPAddress(ipv4);

		expect(result).toBeDefined();
		expect(result.address).toBe(ipv4);
		expect(result.v4).toBe(true);
	});

	it("should parse valid IPv6 address", () => {
		const ipv6 = "2001:db8::1";
		const result = getIPAddress(ipv6);

		expect(result).toBeDefined();
		expect(result.address).toBe(ipv6);
		expect(result.v4).toBe(false);
	});

	it("should throw ProsopoEnvError for invalid IP address", () => {
		const invalidIP = "invalid-ip-address";

		expect(() => getIPAddress(invalidIP)).toThrow(ProsopoEnvError);
		expect(() => getIPAddress(invalidIP)).toThrow("API.INVALID_IP");
	});

	it("should handle IPv4 loopback", () => {
		const loopback = "127.0.0.1";
		const result = getIPAddress(loopback);

		expect(result.address).toBe(loopback);
		expect(result.v4).toBe(true);
	});

	it("should handle IPv6 loopback", () => {
		const loopback = "::1";
		const result = getIPAddress(loopback);

		expect(result.address).toBe(loopback);
		expect(result.v4).toBe(false);
	});
});

describe("getIPAddressFromBigInt", () => {
	it("should convert IPv4 big int to address", () => {
		// 192.168.1.1 as big int
		const ipv4BigInt = 3232235777n;
		const result = getIPAddressFromBigInt(ipv4BigInt);

		expect(result).toBeDefined();
		expect(result.address).toBe("192.168.1.1");
		expect(result.v4).toBe(true);
	});

	it("should convert IPv6 big int to address", () => {
		// 2001:db8::1 as big int (simplified)
		const ipv6BigInt = 42540766411282592856904266426630537217n;
		const result = getIPAddressFromBigInt(ipv6BigInt);

		expect(result).toBeDefined();
		expect(result.v4).toBe(false);
	});

	it("should handle edge cases", () => {
		// Test with 0
		const zero = getIPAddressFromBigInt(0n);
		expect(zero).toBeDefined();
		expect(zero.address).toBe("0.0.0.0");

		// Test with IPv6 range
		const ipv6Value = getIPAddressFromBigInt(4228250627n); // Just over the IPv4 limit
		expect(ipv6Value).toBeDefined();
		expect(ipv6Value.v4).toBe(false);
	});
});
