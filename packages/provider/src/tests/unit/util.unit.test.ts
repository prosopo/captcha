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
import { at } from "@prosopo/util";
import { Address4, Address6 } from "ip-address";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	checkIfTaskIsRunning,
	getIPAddress,
	validateIpAddress,
	validateIpAddressWithDistance,
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
			info: vi.fn().mockImplementation(console.info),
			debug: vi.fn().mockImplementation(console.debug),
			error: vi.fn().mockImplementation(console.error),
			log: vi.fn().mockImplementation(console.log),
			warn: vi.fn().mockImplementation(console.warn),
		} as unknown as Logger;

		vi.clearAllMocks();
	});

	it("should return valid when IP is undefined", () => {
		const result = validateIpAddress(
			undefined,
			Address4.fromBigInt(BigInt(123456789)),
			mockLogger,
		);

		expect(result.isValid).toBe(true);
		expect(result.errorMessage).toBeUndefined();
	});

	it("should return valid when IP addresses match", () => {
		const testIp = "212.132.203.186";
		const ipAddress = Address4.fromBigInt(BigInt(3565472698));

		const result = validateIpAddress(testIp, ipAddress, mockLogger);

		expect(result.isValid).toBe(true);
		expect(result.errorMessage).toBeUndefined();
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const logFn = (mockLogger.info as any).mock.calls[0][0];
		const logObj = logFn();
		expect(logObj).toHaveProperty("data");
		expect(logObj.data).toHaveProperty("ipV4orV6Address");
		expect(logObj.data.ipV4orV6Address).toHaveProperty("address", testIp);
	});

	it("should return valid when when an IPV4 big int is returned from the DB and an IPV4 string is sent in the payload", () => {
		const testIp = "82.43.214.180";
		const ipAddress = Address4.fromBigInt(BigInt(1378604724));

		const result = validateIpAddress(testIp, ipAddress, mockLogger);

		expect(result.isValid).toBe(true);
		expect(result.errorMessage).toBeUndefined();
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const logFn = (mockLogger.info as any).mock.calls[0][0];
		const logObj = logFn();
		expect(logObj).toHaveProperty("data");
		expect(logObj.data).toHaveProperty("ipV4orV6Address");
		expect(logObj.data.ipV4orV6Address).toHaveProperty("address", testIp);
	});

	it("should return valid when when an IPV4 big int is returned from the DB and an IPV6 string is sent in the payload", () => {
		const testIp = "::ffff:82.43.214.180";
		const ipAddress = Address6.fromBigInt(BigInt(1378604724));

		const result = validateIpAddress(testIp, ipAddress, mockLogger);

		expect(result.isValid).toBe(true);
		expect(result.errorMessage).toBeUndefined();
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const logFn = (mockLogger.info as any).mock.calls[0][0];
		const logObj = logFn();
		expect(logObj).toHaveProperty("data");
		expect(logObj.data).toHaveProperty("ipV4orV6Address");
		expect(logObj.data.ipV4orV6Address).toHaveProperty(
			"address",
			at(testIp.split(":"), 3),
		);
	});

	it("should return valid when when an IPV6 big int is returned from the DB and an IPV4 string is sent in the payload", () => {
		const testIp = "82.43.214.180";
		const ipAddress = Address6.fromBigInt(BigInt(1378604724n));

		const result = validateIpAddress(testIp, ipAddress, mockLogger);

		expect(result.isValid).toBe(true);
		expect(result.errorMessage).toBeUndefined();
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const logFn = (mockLogger.info as any).mock.calls[0][0];
		const logObj = logFn();
		expect(logObj).toHaveProperty("data");
		expect(logObj.data).toHaveProperty("ipV4orV6Address");
		expect(logObj.data.ipV4orV6Address).toHaveProperty("address", testIp);
	});

	it("should return valid when when an IPV6 big int is returned from the DB and an IPV6 string is sent in the payload", () => {
		const testIp = "::ffff:82.43.214.180";
		const ipAddress = Address6.fromBigInt(BigInt(281472060348084n));

		const result = validateIpAddress(testIp, ipAddress, mockLogger);

		expect(result.isValid).toBe(true);
		expect(result.errorMessage).toBeUndefined();
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const logFn = (mockLogger.info as any).mock.calls[0][0];
		const logObj = logFn();
		expect(logObj).toHaveProperty("data");
		expect(logObj.data).toHaveProperty("ipV4orV6Address");
		expect(logObj.data.ipV4orV6Address).toHaveProperty(
			"address",
			at(testIp.split(":"), 3),
		);
	});

	it("should return invalid when IP address is malformed", () => {
		const invalidIp = "invalid.ip.address";
		const challengeRecordIp = Address4.fromBigInt(BigInt(3232235777)); // Some valid bigint

		const result = validateIpAddress(invalidIp, challengeRecordIp, mockLogger);

		expect(result.isValid).toBe(false);
		expect(result.errorMessage).toBe(`Invalid IP address: ${invalidIp}`);
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const logFn = (mockLogger.info as any).mock.calls[0][0];
		const logObj = logFn();
		expect(logObj).toHaveProperty("msg");
		expect(logObj.msg).toEqual(`Invalid IP address: ${invalidIp}`);
	});

	it("should return invalid when IP addresses don't match", () => {
		const providedIp = "192.168.1.1";
		const storedIp = Address4.fromBigInt(BigInt(3232235778)); // Different IP as bigint

		const result = validateIpAddress(providedIp, storedIp, mockLogger);

		expect(result.isValid).toBe(false);
		expect(result.errorMessage).toContain("IP address mismatch:");
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const logFn = (mockLogger.info as any).mock.calls[1][0];
		const logObj = logFn();
		expect(logObj).toHaveProperty("msg");
		expect(logObj.msg).toEqual(
			"IP address mismatch: 192.168.1.2 !== 192.168.1.1",
		);
	});

	it("should verify logger is called when IP validation occurs", () => {
		const testIp = "127.0.0.1";
		const ipAddress = getIPAddress(testIp);

		validateIpAddress(testIp, ipAddress, mockLogger);

		expect(mockLogger.info).toHaveBeenCalledTimes(1);
	});
});

describe("validateIpAddressWithDistance", () => {
	let mockLogger: Logger;

	beforeEach(() => {
		mockLogger = {
			info: vi.fn().mockImplementation(() => {}),
			debug: vi.fn().mockImplementation(() => {}),
			error: vi.fn().mockImplementation(() => {}),
			log: vi.fn().mockImplementation(() => {}),
			warn: vi.fn().mockImplementation(() => {}),
		} as unknown as Logger;

		vi.clearAllMocks();
	});

	it("should return valid when IP is undefined", async () => {
		const result = await validateIpAddressWithDistance(
			undefined,
			Address4.fromBigInt(BigInt(123456789)),
			mockLogger,
		);

		expect(result.isValid).toBe(true);
		expect(result.shouldFlag).toBeUndefined();
	});

	it("should return valid when IPs match exactly", async () => {
		const testIp = "192.168.1.1";
		const ipAddress = new Address4("192.168.1.1");

		const result = await validateIpAddressWithDistance(
			testIp,
			ipAddress,
			mockLogger,
		);

		expect(result.isValid).toBe(true);
		expect(result.shouldFlag).toBeUndefined();
	});

	it("should return invalid for malformed IP addresses", async () => {
		const invalidIp = "invalid.ip.address";
		const challengeRecordIp = Address4.fromBigInt(BigInt(3232235777));

		const result = await validateIpAddressWithDistance(
			invalidIp,
			challengeRecordIp,
			mockLogger,
		);

		expect(result.isValid).toBe(false);
		expect(result.errorMessage).toBe(`Invalid IP address: ${invalidIp}`);
	});
});
