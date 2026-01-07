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
import { describe, expect, it } from "vitest";
import { solvePoW } from "../solverService.js";

describe("solverService", () => {
	describe("solvePoW", () => {
		it("finds nonce for difficulty 0", () => {
			const data = "test";
			const nonce = solvePoW(data, 0);
			expect(typeof nonce).toBe("number");
			expect(nonce).toBeGreaterThanOrEqual(0);
		});

		it("finds nonce for difficulty 1", () => {
			const data = "test";
			const nonce = solvePoW(data, 1);
			expect(typeof nonce).toBe("number");
			expect(nonce).toBeGreaterThanOrEqual(0);
		});

		it("finds nonce for difficulty 2", () => {
			const data = "test";
			const nonce = solvePoW(data, 2);
			expect(typeof nonce).toBe("number");
			expect(nonce).toBeGreaterThanOrEqual(0);
		});

		it("returns different nonces for different data", () => {
			const nonce1 = solvePoW("data1", 1);
			const nonce2 = solvePoW("data2", 1);
			expect(nonce1).not.toBe(nonce2);
		});

		it("returns different nonces for same data with different difficulty", () => {
			const nonce1 = solvePoW("data", 1);
			const nonce2 = solvePoW("data", 2);
			expect(nonce1).not.toBe(nonce2);
		});
	});
});

