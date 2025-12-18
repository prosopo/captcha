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

import { describe, expect, it, vi } from "vitest";
import {
	chunkIntoBatches,
	executeBatchesInParallel,
	executeBatchesSequentially,
} from "../batches.js";

describe("chunkIntoBatches", () => {
	it("should chunk into batches", () => {
		const batches = chunkIntoBatches([1, 2, 3], 2);

		expect(batches).toEqual([[1, 2], [3]]);
	});

	it("should handle the empty items case", () => {
		const batches = chunkIntoBatches([], 2);

		expect(batches).toEqual([]);
	});

	it("should handle chunk size larger than array", () => {
		const batches = chunkIntoBatches([1, 2, 3], 10);

		expect(batches).toEqual([[1, 2, 3]]);
	});

	it("should handle chunk size of 1", () => {
		const batches = chunkIntoBatches([1, 2, 3], 1);

		expect(batches).toEqual([[1], [2], [3]]);
	});

	it("should handle exact division", () => {
		const batches = chunkIntoBatches([1, 2, 3, 4], 2);

		expect(batches).toEqual([
			[1, 2],
			[3, 4],
		]);
	});
});

describe("executeBatchesSequentially", () => {
	it("should execute batches in sequence", async () => {
		const batches = [1, 2, 3];
		const handler = vi.fn(async (batch: number) => batch * 2);

		const results = await executeBatchesSequentially(batches, handler);

		expect(results).toEqual([2, 4, 6]);
		expect(handler).toHaveBeenCalledTimes(3);
	});

	it("should pass correct index to handler", async () => {
		const batches = ["a", "b", "c"];
		const handler = vi.fn(
			async (batch: string, index: number) => `${batch}-${index}`,
		);

		const results = await executeBatchesSequentially(batches, handler);

		expect(results).toEqual(["a-0", "b-1", "c-2"]);
		expect(handler).toHaveBeenNthCalledWith(1, "a", 0);
		expect(handler).toHaveBeenNthCalledWith(2, "b", 1);
		expect(handler).toHaveBeenNthCalledWith(3, "c", 2);
	});

	it("should handle empty batches", async () => {
		const batches: number[] = [];
		const handler = vi.fn(async (batch: number) => batch * 2);

		const results = await executeBatchesSequentially(batches, handler);

		expect(results).toEqual([]);
		expect(handler).not.toHaveBeenCalled();
	});

	it("should execute batches sequentially, not in parallel", async () => {
		const executionOrder: number[] = [];
		const batches = [1, 2, 3];
		const handler = vi.fn(async (batch: number, index: number) => {
			// Delay to ensure sequential execution
			await new Promise((resolve) => setTimeout(resolve, 10));
			executionOrder.push(index);
			return batch;
		});

		await executeBatchesSequentially(batches, handler);

		expect(executionOrder).toEqual([0, 1, 2]);
	});

	it("should stop execution if handler throws error", async () => {
		const batches = [1, 2, 3];
		const handler = vi.fn(async (batch: number, index: number) => {
			if (index === 1) {
				throw new Error("Handler error");
			}
			return batch * 2;
		});

		await expect(executeBatchesSequentially(batches, handler)).rejects.toThrow(
			"Handler error",
		);
		expect(handler).toHaveBeenCalledTimes(2);
	});
});

describe("executeBatchesInParallel", () => {
	it("should execute batches in parallel", async () => {
		const batches = [1, 2, 3];
		const handler = vi.fn(async (batch: number) => batch * 2);

		const results = await executeBatchesInParallel(batches, handler);

		expect(results).toEqual([2, 4, 6]);
		expect(handler).toHaveBeenCalledTimes(3);
	});

	it("should pass batch and index to handler", async () => {
		const batches = ["a", "b", "c"];
		const handler = vi.fn(
			async (batch: string, index: number) => `${batch}-${index}`,
		);

		const results = await executeBatchesInParallel(batches, handler);

		expect(results).toEqual(["a-0", "b-1", "c-2"]);
		// Note: Array.map passes (element, index, array) so handler receives 3 args
		expect(handler).toHaveBeenNthCalledWith(1, "a", 0, batches);
		expect(handler).toHaveBeenNthCalledWith(2, "b", 1, batches);
		expect(handler).toHaveBeenNthCalledWith(3, "c", 2, batches);
	});

	it("should handle empty batches", async () => {
		const batches: number[] = [];
		const handler = vi.fn(async (batch: number) => batch * 2);

		const results = await executeBatchesInParallel(batches, handler);

		expect(results).toEqual([]);
		expect(handler).not.toHaveBeenCalled();
	});

	it("should execute batches in parallel, not sequentially", async () => {
		const startTimes: number[] = [];
		const batches = [1, 2, 3];
		const handler = vi.fn(async (batch: number) => {
			startTimes.push(Date.now());
			await new Promise((resolve) => setTimeout(resolve, 50));
			return batch;
		});

		await executeBatchesInParallel(batches, handler);

		// All batches should start within a short time window if executed in parallel
		const maxStartTimeDiff = Math.max(...startTimes) - Math.min(...startTimes);
		expect(maxStartTimeDiff).toBeLessThan(40);
	});

	it("should reject if any handler throws error", async () => {
		const batches = [1, 2, 3];
		const handler = vi.fn(async (batch: number, index: number) => {
			if (index === 1) {
				throw new Error("Handler error");
			}
			return batch * 2;
		});

		await expect(executeBatchesInParallel(batches, handler)).rejects.toThrow(
			"Handler error",
		);
		// All handlers should be called since they run in parallel
		expect(handler).toHaveBeenCalledTimes(3);
	});
});
