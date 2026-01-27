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

import type { Logger } from "@prosopo/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBehavioralData } from "../../../../tasks/detection/getBehavioralData.js";

// Mock the decodeBehavior module
vi.mock("../../../../tasks/detection/decodeBehavior.js", () => ({
	default: vi.fn(),
}));

describe("getBehavioralData", () => {
	let mockLogger: Logger;
	let mockDecryptBehavioralData: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		vi.clearAllMocks();
		vi.resetModules();

		mockLogger = {
			error: vi.fn(),
			info: vi.fn(),
			debug: vi.fn(),
		} as unknown as Logger;

		const decodeBehaviorModule = await import(
			"../../../../tasks/detection/decodeBehavior.js"
		);
		mockDecryptBehavioralData = decodeBehaviorModule.default as ReturnType<
			typeof vi.fn
		>;
	});

	it("should successfully decrypt behavioral data with first key", async () => {
		const encryptedData = "encrypted-data";
		const keys = ["key1", "key2"];
		const mockResult = {
			collector1: [{ x: 1, y: 2 }],
			collector2: [{ x: 3, y: 4 }],
			collector3: [{ x: 5, y: 6 }],
			deviceCapability: "touch",
			timestamp: Date.now(),
		};

		mockDecryptBehavioralData.mockResolvedValueOnce(mockResult);

		const result = await getBehavioralData(encryptedData, keys, mockLogger);

		expect(result).toEqual(mockResult);
		expect(mockDecryptBehavioralData).toHaveBeenCalledTimes(1);
		expect(mockDecryptBehavioralData).toHaveBeenCalledWith(
			encryptedData,
			"key1",
		);
		expect(mockLogger.info).toHaveBeenCalledWith(expect.any(Function));
	});

	it("should try second key if first fails", async () => {
		const encryptedData = "encrypted-data";
		const keys = ["key1", "key2"];
		const mockResult = {
			collector1: [{ x: 1, y: 2 }],
			collector2: [{ x: 3, y: 4 }],
			collector3: [{ x: 5, y: 6 }],
			deviceCapability: "touch",
			timestamp: Date.now(),
		};

		mockDecryptBehavioralData
			.mockRejectedValueOnce(new Error("Decryption failed"))
			.mockResolvedValueOnce(mockResult);

		const result = await getBehavioralData(encryptedData, keys, mockLogger);

		expect(result).toEqual(mockResult);
		expect(mockDecryptBehavioralData).toHaveBeenCalledTimes(2);
		expect(mockDecryptBehavioralData).toHaveBeenNthCalledWith(
			1,
			encryptedData,
			"key1",
		);
		expect(mockDecryptBehavioralData).toHaveBeenNthCalledWith(
			2,
			encryptedData,
			"key2",
		);
		expect(mockLogger.debug).toHaveBeenCalled();
		expect(mockLogger.info).toHaveBeenCalled();
	});

	it("should return null if all keys fail", async () => {
		const encryptedData = "encrypted-data";
		const keys = ["key1", "key2"];

		mockDecryptBehavioralData
			.mockRejectedValueOnce(new Error("Decryption failed"))
			.mockRejectedValueOnce(new Error("Decryption failed"));

		const result = await getBehavioralData(encryptedData, keys, mockLogger);

		expect(result).toBeNull();
		expect(mockDecryptBehavioralData).toHaveBeenCalledTimes(2);
		expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Function));
	});

	it("should return null and log error if no keys provided", async () => {
		const encryptedData = "encrypted-data";
		const keys: string[] = [];

		const result = await getBehavioralData(encryptedData, keys, mockLogger);

		expect(result).toBeNull();
		expect(mockDecryptBehavioralData).not.toHaveBeenCalled();
		expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Function));
	});

	it("should filter out undefined keys", async () => {
		const encryptedData = "encrypted-data";
		const keys = ["key1", undefined, "key2"];
		const mockResult = {
			collector1: [{ x: 1, y: 2 }],
			collector2: [],
			collector3: [],
			deviceCapability: "no-touch",
			timestamp: Date.now(),
		};

		mockDecryptBehavioralData.mockResolvedValueOnce(mockResult);

		const result = await getBehavioralData(encryptedData, keys, mockLogger);

		expect(result).toEqual(mockResult);
		expect(mockDecryptBehavioralData).toHaveBeenCalledTimes(1);
		expect(mockDecryptBehavioralData).toHaveBeenCalledWith(
			encryptedData,
			"key1",
		);
	});

	it("should work without logger", async () => {
		const encryptedData = "encrypted-data";
		const keys = ["key1"];
		const mockResult = {
			collector1: [],
			collector2: [],
			collector3: [],
			deviceCapability: "unknown",
			timestamp: Date.now(),
		};

		mockDecryptBehavioralData.mockResolvedValueOnce(mockResult);

		const result = await getBehavioralData(encryptedData, keys);

		expect(result).toEqual(mockResult);
		expect(mockDecryptBehavioralData).toHaveBeenCalledTimes(1);
	});
});
