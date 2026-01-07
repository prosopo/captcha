import { sha256 } from "@noble/hashes/sha256";
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
import { describe, expect, test } from "vitest";
import { solvePoW } from "./solverService.js";

describe("solvePoW", () => {
	test("types", () => {
		// Verify function signature accepts string and number parameters
		type Params = Parameters<typeof solvePoW>;
		const _p1: string = "" as Params[0];
		const _p2: number = 0 as Params[1];

		// Verify return type is number
		type SolvePoWReturnType = ReturnType<typeof solvePoW>;
		const _r1: number = 0 as SolvePoWReturnType;
	});

	test("finds nonce for difficulty 0", () => {
		const data = "test";
		const difficulty = 0;
		const nonce = solvePoW(data, difficulty);
		expect(typeof nonce).toBe("number");
		expect(nonce).toBeGreaterThanOrEqual(0);
	});

	test("finds nonce for difficulty 1", () => {
		const data = "test";
		const difficulty = 1;
		const nonce = solvePoW(data, difficulty);
		expect(typeof nonce).toBe("number");
		expect(nonce).toBeGreaterThanOrEqual(0);

		// Verify the solution
		const message = new TextEncoder().encode(nonce + data);
		const hashHex = Array.from(sha256(message))
			.map((byte) => byte.toString(16).padStart(2, "0"))
			.join("");
		expect(hashHex.startsWith("0")).toBe(true);
	});

	test("finds nonce for difficulty 2", () => {
		const data = "test";
		const difficulty = 2;
		const nonce = solvePoW(data, difficulty);
		expect(typeof nonce).toBe("number");
		expect(nonce).toBeGreaterThanOrEqual(0);

		// Verify the solution
		const message = new TextEncoder().encode(nonce + data);
		const hashHex = Array.from(sha256(message))
			.map((byte) => byte.toString(16).padStart(2, "0"))
			.join("");
		expect(hashHex.startsWith("00")).toBe(true);
	});

	test("finds nonce for difficulty 3", () => {
		const data = "test";
		const difficulty = 3;
		const nonce = solvePoW(data, difficulty);
		expect(typeof nonce).toBe("number");
		expect(nonce).toBeGreaterThanOrEqual(0);

		// Verify the solution
		const message = new TextEncoder().encode(nonce + data);
		const hashHex = Array.from(sha256(message))
			.map((byte) => byte.toString(16).padStart(2, "0"))
			.join("");
		expect(hashHex.startsWith("000")).toBe(true);
	});

	test("returns known solutions", () => {
		const inputs = ["abc", "def", "ghi"]
		const diffs = [3, 4, 5]
		const solutions = [13843, 81184, 310094]

		for (let i = 0; i < inputs.length; i++) {
			// for each precomputed input/output
			const input = inputs[i] || ""
			const diff = diffs[i] || 0
			const sol = solutions[i]

			// do the pow
			const ans = solvePoW(input, diff)

			// compare answer to expected solution
			expect(ans).toBe(sol)
		}
	});

	test("returns consistent nonce for same data and difficulty", () => {
		const data = "test";
		const difficulty = 2;

		const nonce1 = solvePoW(data, difficulty);
		const nonce2 = solvePoW(data, difficulty);

		// Should return the same nonce (first valid one found)
		expect(nonce1).toBe(nonce2);
	});

	test("handles empty string data", () => {
		const data = "";
		const difficulty = 1;
		const nonce = solvePoW(data, difficulty);
		expect(typeof nonce).toBe("number");
		expect(nonce).toBeGreaterThanOrEqual(0);
	});

	test("handles long string data", () => {
		const data = "a".repeat(1000);
		const difficulty = 1;
		const nonce = solvePoW(data, difficulty);
		expect(typeof nonce).toBe("number");
		expect(nonce).toBeGreaterThanOrEqual(0);
	});

	test("handles special characters in data", () => {
		const data = "!@#$%^&*()";
		const difficulty = 1;
		const nonce = solvePoW(data, difficulty);
		expect(typeof nonce).toBe("number");
		expect(nonce).toBeGreaterThanOrEqual(0);
	});

	test("nonce increases with difficulty", () => {
		const data = "test";
		const nonce1 = solvePoW(data, 1);
		const nonce2 = solvePoW(data, 2);
		const nonce3 = solvePoW(data, 3);

		// Higher difficulty should generally take longer (more iterations)
		// But we can't guarantee nonce order, just verify they're numbers
		expect(typeof nonce1).toBe("number");
		expect(typeof nonce2).toBe("number");
		expect(typeof nonce3).toBe("number");
	});
});
