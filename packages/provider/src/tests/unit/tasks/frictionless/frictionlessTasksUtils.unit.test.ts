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

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { timestampDecayFunction } from "../../../../tasks/frictionless/frictionlessTasksUtils.js";

describe("frictionlessTasksUtils", () => {
	describe("timestampDecayFunction", () => {
		let mockNow: number;

		beforeEach(() => {
			// Mock Date.now to return a consistent value
			mockNow = Date.now(); // Use current time for more realistic testing
			vi.spyOn(Date, "now").mockReturnValue(mockNow);
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("should return 6 when decryption failed", () => {
			const result = timestampDecayFunction(mockNow - 1000, true);
			expect(result).toBe(6);
		});

		it("should return 12 when timestamp is more than 1 hour old", () => {
			const oldTimestamp = mockNow - 3600001; // Just over 1 hour ago
			const result = timestampDecayFunction(oldTimestamp, false);
			expect(result).toBe(12);
		});

		it("should return a number for recent timestamps", () => {
			const recentTimestamp = mockNow - 1000; // 1 second ago
			const result = timestampDecayFunction(recentTimestamp, false);
			expect(typeof result).toBe("number");
			expect(result).toBeGreaterThanOrEqual(2);
			expect(result).toBeLessThanOrEqual(12);
		});

		it("should return a number for older timestamps within 1 hour", () => {
			const thirtyMinOld = mockNow - 1800000; // 30 minutes ago
			const result = timestampDecayFunction(thirtyMinOld, false);
			expect(typeof result).toBe("number");
			expect(result).toBeGreaterThanOrEqual(2);
			expect(result).toBeLessThanOrEqual(12);
		});

		it("should handle very old timestamps", () => {
			const veryOldTimestamp = mockNow - (24 * 60 * 60 * 1000); // 24 hours ago
			const result = timestampDecayFunction(veryOldTimestamp, false);
			expect(result).toBe(12);
		});

		it("should handle future timestamps", () => {
			const futureTimestamp = mockNow + 10000; // 10 seconds in future
			const result = timestampDecayFunction(futureTimestamp, false);
			expect(typeof result).toBe("number");
			expect(result).toBeGreaterThanOrEqual(2);
			expect(result).toBeLessThanOrEqual(12);
		});
	});
});