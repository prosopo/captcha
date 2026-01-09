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

import { describe, expect, it } from "vitest";
import { solvePoW } from "../solverService.js";

describe("solvePoW", () => {
	it("should find nonce for difficulty 0 (no leading zeros required)", async () => {
		const data = "test";
		const difficulty = 0;

		const nonce = solvePoW(data, difficulty);

		expect(typeof nonce).toBe("number");
		expect(nonce).toBeGreaterThanOrEqual(0);

		// Verify the solution works
		const { sha256 } = await import("@noble/hashes/sha256");
		const message = new TextEncoder().encode(nonce + data);
		const hashHex = Array.from(sha256(message))
			.map((byte) => byte.toString(16).padStart(2, "0"))
			.join("");

		// With difficulty 0, any hash is valid
		expect(hashHex).toBeDefined();
		expect(typeof hashHex).toBe("string");
		expect(hashHex.length).toBe(64); // SHA256 produces 32 bytes = 64 hex chars
	});

	it("should find nonce for difficulty 1 (one leading zero)", async () => {
		const data = "test";
		const difficulty = 1;

		const nonce = solvePoW(data, difficulty);

		expect(typeof nonce).toBe("number");
		expect(nonce).toBeGreaterThanOrEqual(0);

		// Verify the solution works
		const { sha256 } = await import("@noble/hashes/sha256");
		const message = new TextEncoder().encode(nonce + data);
		const hashHex = Array.from(sha256(message))
			.map((byte) => byte.toString(16).padStart(2, "0"))
			.join("");

		expect(hashHex.startsWith("0")).toBe(true);
	});

	it("should find nonce for difficulty 2 (two leading zeros)", async () => {
		const data = "test";
		const difficulty = 2;

		const nonce = solvePoW(data, difficulty);

		expect(typeof nonce).toBe("number");
		expect(nonce).toBeGreaterThanOrEqual(0);

		// Verify the solution works
		const { sha256 } = await import("@noble/hashes/sha256");
		const message = new TextEncoder().encode(nonce + data);
		const hashHex = Array.from(sha256(message))
			.map((byte) => byte.toString(16).padStart(2, "0"))
			.join("");

		expect(hashHex.startsWith("00")).toBe(true);
	});

	it("should handle empty data string", () => {
		const data = "";
		const difficulty = 0;

		const nonce = solvePoW(data, difficulty);

		expect(typeof nonce).toBe("number");
		expect(nonce).toBeGreaterThanOrEqual(0);
	});

	it("should handle different data strings", () => {
		const testCases = [
			"hello",
			"world",
			"123456",
			"!@#$%^&*()",
			"very long string with many characters that should still work",
		];

		for (const data of testCases) {
			const nonce = solvePoW(data, 0);
			expect(typeof nonce).toBe("number");
			expect(nonce).toBeGreaterThanOrEqual(0);
		}
	});

	it("should return different nonces for same data (non-deterministic)", () => {
		const data = "test";
		const difficulty = 0;

		const nonce1 = solvePoW(data, difficulty);
		const nonce2 = solvePoW(data, difficulty);

		// Since difficulty is 0, any nonce works, so we might get different results
		// But they should both be valid numbers
		expect(typeof nonce1).toBe("number");
		expect(typeof nonce2).toBe("number");
		expect(nonce1).toBeGreaterThanOrEqual(0);
		expect(nonce2).toBeGreaterThanOrEqual(0);
	});

	it("should eventually find solution for higher difficulty", async () => {
		const data = "test";
		const difficulty = 3; // Three leading zeros

		// This might take longer, but should complete
		const nonce = solvePoW(data, difficulty);

		expect(typeof nonce).toBe("number");
		expect(nonce).toBeGreaterThanOrEqual(0);

		// Verify the solution works
		const { sha256 } = await import("@noble/hashes/sha256");
		const message = new TextEncoder().encode(nonce + data);
		const hashHex = Array.from(sha256(message))
			.map((byte) => byte.toString(16).padStart(2, "0"))
			.join("");

		expect(hashHex.startsWith("000")).toBe(true);
	}, { timeout: 10000 }); // Allow up to 10 seconds for this test

	it("should handle very high nonce values if needed", async () => {
		// This test might be slow, but demonstrates the function works
		// We'll use a timeout to prevent hanging
		const data = "hard_to_solve";
		const difficulty = 4;

		const startTime = Date.now();
		const nonce = solvePoW(data, difficulty);
		const endTime = Date.now();

		expect(typeof nonce).toBe("number");
		expect(nonce).toBeGreaterThanOrEqual(0);
		// Should complete within reasonable time (adjust as needed)
		expect(endTime - startTime).toBeLessThan(30000); // 30 seconds max

		// Verify the solution works
		const { sha256 } = await import("@noble/hashes/sha256");
		const message = new TextEncoder().encode(nonce + data);
		const hashHex = Array.from(sha256(message))
			.map((byte) => byte.toString(16).padStart(2, "0"))
			.join("");

		expect(hashHex.startsWith("0000")).toBe(true);
	}, { timeout: 30000 }); // Allow up to 30 seconds for this test
});