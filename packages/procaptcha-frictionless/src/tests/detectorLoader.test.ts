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

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDetectorFn = vi.fn();

vi.mock("@prosopo/detector", () => ({
	default: mockDetectorFn,
}));

import { DetectorLoader } from "../detectorLoader.js";

describe("DetectorLoader", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should load and return the default detector from @prosopo/detector", async () => {
		const result = await DetectorLoader();

		expect(result).toBe(mockDetectorFn);
	});

	it("should return a function that can be called", async () => {
		mockDetectorFn.mockReturnValue("test-result");

		const detector = await DetectorLoader();
		const callResult = detector();

		expect(callResult).toBe("test-result");
		expect(mockDetectorFn).toHaveBeenCalled();
	});

	it("should handle dynamic import correctly", async () => {
		const detector1 = await DetectorLoader();
		const detector2 = await DetectorLoader();

		expect(detector1).toBe(mockDetectorFn);
		expect(detector2).toBe(mockDetectorFn);
	});
});
