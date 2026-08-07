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
import { sha256 } from "@noble/hashes/sha256";
import { describe, expect, it } from "vitest";
import {
	hashMeetsDifficulty,
	solvePoW,
	solvePoWOffset,
	targetForDifficulty,
} from "../solverService.js";

describe("targetForDifficulty", () => {
	it("returns 2^240 for difficulty 4 (16 bits)", () => {
		expect(targetForDifficulty(4)).toBe(1n << 240n);
	});

	it("returns 2^236 for difficulty 5 (20 bits)", () => {
		expect(targetForDifficulty(5)).toBe(1n << 236n);
	});

	it("quantises fractional difficulty to bit-level granularity", () => {
		// 0.25 step ≡ 1 bit
		expect(targetForDifficulty(4.25)).toBe(1n << 239n);
		expect(targetForDifficulty(4.5)).toBe(1n << 238n);
		expect(targetForDifficulty(4.75)).toBe(1n << 237n);
	});

	it("is strictly decreasing in difficulty", () => {
		const ds = [1, 2, 3, 3.5, 4, 4.25, 4.5, 4.75, 5, 6, 7];
		for (let i = 1; i < ds.length; i++) {
			expect(targetForDifficulty(ds[i] as number)).toBeLessThan(
				targetForDifficulty(ds[i - 1] as number),
			);
		}
	});
});

describe("hashMeetsDifficulty", () => {
	const hashOf = (data: string): Uint8Array =>
		sha256(new TextEncoder().encode(data));

	it("matches the legacy hex-prefix check for integer difficulty", () => {
		for (let n = 0; n < 200; n++) {
			const hash = hashOf(`${n}challenge`);
			const hex = Array.from(hash)
				.map((b: number) => b.toString(16).padStart(2, "0"))
				.join("");
			for (const d of [1, 2, 3, 4]) {
				expect(hashMeetsDifficulty(hash, d)).toBe(
					hex.startsWith("0".repeat(d)),
				);
			}
		}
	});

	it("is monotonic — meeting harder difficulty implies meeting easier", () => {
		// Pick a nonce that meets difficulty 3 (12 bits ≡ ~1 in 4k). Over 200k
		// attempts the probability of zero matches is e^(-48) — no flake risk,
		// whereas a difficulty-4 search (16 bits ≡ ~1 in 65k) over the same
		// budget misses ~5% of the time.
		let met: Uint8Array | null = null;
		for (let n = 0; n < 200_000; n++) {
			const h = hashOf(`${n}monotonic`);
			if (hashMeetsDifficulty(h, 3)) {
				met = h;
				break;
			}
		}
		expect(met).not.toBeNull();
		if (met) {
			for (const easier of [2.75, 2.5, 2, 1]) {
				expect(hashMeetsDifficulty(met, easier)).toBe(true);
			}
		}
	});
});

describe("solvePoW", () => {
	it("returns a nonce whose hash meets the difficulty", async () => {
		const challenge = "solver-roundtrip";
		const difficulty = 2;
		const nonce = await solvePoW(challenge, difficulty);
		const hash = sha256(new TextEncoder().encode(nonce + challenge));
		expect(hashMeetsDifficulty(hash, difficulty)).toBe(true);
	});

	it("respects fractional difficulty in the round-trip", async () => {
		const challenge = "solver-fractional";
		const difficulty = 2.5;
		const nonce = await solvePoW(challenge, difficulty);
		const hash = sha256(new TextEncoder().encode(nonce + challenge));
		expect(hashMeetsDifficulty(hash, difficulty)).toBe(true);
	});
});

describe("solvePoWOffset", () => {
	const hashOfNonce = (nonce: number, data: string): Uint8Array =>
		sha256(new TextEncoder().encode(nonce + data));

	it("returns a nonce whose hash meets the difficulty", () => {
		const challenge = "offset-roundtrip";
		const difficulty = 2;
		const nonce = solvePoWOffset(challenge, difficulty, 0, 1);
		expect(hashMeetsDifficulty(hashOfNonce(nonce, challenge), difficulty)).toBe(
			true,
		);
	});

	it("only searches its own (start, step) slice of the nonce space", () => {
		const challenge = "offset-disjoint";
		const difficulty = 2;
		const step = 4;
		for (let start = 0; start < step; start++) {
			const nonce = solvePoWOffset(challenge, difficulty, start, step);
			// worker `start` must return a nonce congruent to `start` mod `step`
			expect(nonce % step).toBe(start);
			expect(
				hashMeetsDifficulty(hashOfNonce(nonce, challenge), difficulty),
			).toBe(true);
		}
	});

	it("with (start=0, step=1) finds the same first nonce as solvePoW", async () => {
		const challenge = "offset-matches-solvePoW";
		const difficulty = 2;
		const expected = await solvePoW(challenge, difficulty);
		expect(solvePoWOffset(challenge, difficulty, 0, 1)).toBe(expected);
	});

	it("divide-and-conquer: the smallest winning nonce across a pool equals the single-threaded result", async () => {
		const challenge = "offset-pool";
		const difficulty = 2;
		const step = 8;
		const expected = await solvePoW(challenge, difficulty);
		const poolWinners: number[] = [];
		for (let start = 0; start < step; start++) {
			poolWinners.push(solvePoWOffset(challenge, difficulty, start, step));
		}
		expect(Math.min(...poolWinners)).toBe(expected);
	});

	it("throws on a non-integer start", () => {
		expect(() => solvePoWOffset("x", 2, 0.5, 1)).toThrow(/start/);
	});

	it("throws on a non-positive or non-integer step", () => {
		expect(() => solvePoWOffset("x", 2, 0, 0)).toThrow(/step/);
		expect(() => solvePoWOffset("x", 2, 0, -1)).toThrow(/step/);
		expect(() => solvePoWOffset("x", 2, 0, 1.5)).toThrow(/step/);
	});

	it("throws on a negative or non-finite difficulty", () => {
		expect(() => solvePoWOffset("x", -1, 0, 1)).toThrow(/difficulty/);
		expect(() => solvePoWOffset("x", Number.NaN, 0, 1)).toThrow(/difficulty/);
	});
});
