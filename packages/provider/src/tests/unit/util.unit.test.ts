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
import { ScheduledTaskNames } from "@prosopo/types";
import type {
	IProviderDatabase,
	ScheduledTaskRecord,
} from "@prosopo/types-database";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	checkIfTaskIsRunning,
	getIPAddress,
	validateIpAddress,
} from "../../util.js";

describe("checkIfTaskIsRunning", () => {
	it("should return false if the task is not running", async () => {
		const taskName = ScheduledTaskNames.StoreCommitmentsExternal;
		const db = {
			getLastScheduledTaskStatus: vi.fn().mockResolvedValue(null),
		} as unknown as IProviderDatabase;
		const result = await checkIfTaskIsRunning(taskName, db);
		expect(result).toBe(false);
	});
	it("should return false if the task is running and completed", async () => {
		const taskName = ScheduledTaskNames.StoreCommitmentsExternal;
		const db = {
			getLastScheduledTaskStatus: vi
				.fn()
				.mockResolvedValue({ _id: "123" } as Pick<ScheduledTaskRecord, "_id">),
			getScheduledTaskStatus: vi.fn().mockResolvedValue({
				_id: "123",
				status: "Completed",
			} as Pick<ScheduledTaskRecord, "_id" | "status">),
		} as unknown as IProviderDatabase;
		const result = await checkIfTaskIsRunning(taskName, db);
		expect(result).toBe(false);
	});
	it("should return true if the task is running and not completed", async () => {
		const taskName = ScheduledTaskNames.StoreCommitmentsExternal;
		const db = {
			getLastScheduledTaskStatus: vi.fn().mockResolvedValue({
				_id: "123",
				datetime: new Date().getTime(),
			} as Pick<ScheduledTaskRecord, "_id">),
			getScheduledTaskStatus: vi.fn().mockResolvedValue(null),
		} as unknown as IProviderDatabase;
		const result = await checkIfTaskIsRunning(taskName, db);
		expect(result).toBe(true);
	});
});

describe("validateIpAddress", () => {
	let mockLogger: Logger;

	beforeEach(() => {
		mockLogger = {
			log: vi.fn(),
			debug: vi.fn(),
			info: vi.fn(),
			error: vi.fn(),
		} as unknown as Logger;
		vi.clearAllMocks();
	});

	it("should return valid when IP is undefined", () => {
		const result = validateIpAddress(undefined, BigInt(123456789), mockLogger);

		expect(result.isValid).toBe(true);
		expect(result.errorMessage).toBeUndefined();
	});

	it("should return valid when IP addresses match", () => {
		const testIp = "212.132.203.186";
		const ipBigInt = BigInt(3565472698);

		const result = validateIpAddress(testIp, ipBigInt, mockLogger);

		expect(result.isValid).toBe(true);
		expect(result.errorMessage).toBeUndefined();
		expect(mockLogger.log).toHaveBeenCalledWith(
			expect.objectContaining({
				ipV4Address: expect.objectContaining({
					address: testIp,
				}),
			}),
		);
	});

	it("should return invalid when IP address is malformed", () => {
		const invalidIp = "invalid.ip.address";
		const challengeRecordIp = BigInt(3232235777); // Some valid bigint

		const result = validateIpAddress(invalidIp, challengeRecordIp, mockLogger);

		expect(result.isValid).toBe(false);
		expect(result.errorMessage).toBe(`Invalid IP address: ${invalidIp}`);
		expect(mockLogger.debug).toHaveBeenCalledWith(
			`Invalid IP address: ${invalidIp}`,
		);
	});

	it("should return invalid when IP addresses don't match", () => {
		const providedIp = "192.168.1.1";
		const storedIpBigInt = BigInt(3232235778); // Different IP as bigint

		const result = validateIpAddress(providedIp, storedIpBigInt, mockLogger);

		expect(result.isValid).toBe(false);
		expect(result.errorMessage).toContain("IP address mismatch:");
		expect(mockLogger.debug).toHaveBeenCalledWith(
			expect.stringContaining("IP address mismatch:"),
		);
	});

	it("should verify logger is called when IP validation occurs", () => {
		const testIp = "127.0.0.1";
		const ipAddress = getIPAddress(testIp);
		const ipBigInt = ipAddress.bigInt();

		validateIpAddress(testIp, ipBigInt, mockLogger);

		expect(mockLogger.log).toHaveBeenCalledTimes(1);
		expect(mockLogger.log).toHaveBeenCalledWith(
			expect.objectContaining({
				ipV4Address: expect.any(Object),
			}),
		);
	});
});
