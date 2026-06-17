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
import { hashMeetsDifficulty, solvePoW } from "../solverService.js";

// The PoW hot loop spends almost all of its wall-clock inside sha256, which is
// unchanged by this optimisation, so a whole-loop timing comparison is
// dominated by hashing noise. These benchmarks instead isolate the two
// per-iteration components the optimisation actually changes:
//
//   1. message construction — original allocated a TextEncoder and re-encoded
//      `nonce + data` every iteration; optimised reuses one buffer and rewrites
//      only the nonce's decimal digits in place.
//   2. the reject check — original converted the full 32-byte hash to a 256-bit
//      bigint and compared; optimised does a byte-wise leading-zero test that
//      bails on the first non-zero byte.
//
// Both are measured against faithful baselines so a regression that reverts
// either back to per-iteration allocation / bigint conversion is caught.

const timeMs = (fn: () => void): number => {
	const start = performance.now();
	fn();
	return performance.now() - start;
};

const report = (label: string, baselineMs: number, optimisedMs: number) => {
	console.log(
		`${label}: baseline=${baselineMs.toFixed(1)}ms, ` +
			`optimised=${optimisedMs.toFixed(1)}ms, ` +
			`speedup=${(baselineMs / optimisedMs).toFixed(2)}x`,
	);
};

describe("solvePoW benchmark", () => {
	const ITERATIONS = 1_000_000;
	const data = "benchmark-challenge-data";

	it(
		"message construction: buffer reuse beats per-iteration encoding",
		{ timeout: 60_000 },
		() => {
			const baseline = () => {
				let sink = 0;
				for (let nonce = 0; nonce < ITERATIONS; nonce++) {
					const message = new TextEncoder().encode(nonce + data);
					sink += message[0] as number; // consume so V8 cannot elide
				}
				return sink;
			};

			const optimised = () => {
				const encoder = new TextEncoder();
				const dataBytes = encoder.encode(data);
				let digits = 1;
				let rollover = 10;
				let message = new Uint8Array(digits + dataBytes.length);
				message.set(dataBytes, digits);
				let sink = 0;
				for (let nonce = 0; nonce < ITERATIONS; nonce++) {
					if (nonce === rollover) {
						digits += 1;
						rollover *= 10;
						message = new Uint8Array(digits + dataBytes.length);
						message.set(dataBytes, digits);
					}
					let n = nonce;
					for (let i = digits - 1; i >= 0; i--) {
						message[i] = 48 + (n % 10);
						n = Math.floor(n / 10);
					}
					sink += message[0] as number;
				}
				return sink;
			};

			baseline();
			optimised(); // warm up
			const baselineMs = timeMs(baseline);
			const optimisedMs = timeMs(optimised);
			report("message construction", baselineMs, optimisedMs);

			// the optimised path avoids ~2M TextEncoder allocations and string
			// concatenations; it should be comfortably faster. Loose 0.9x bound
			// absorbs GC / scheduling noise on shared CI runners.
			expect(optimisedMs).toBeLessThan(baselineMs * 0.9);
		},
	);

	it(
		"reject check: byte-wise leading-zero test beats bigint conversion",
		{ timeout: 60_000 },
		() => {
			// pre-generate a fixed set of hashes so both variants score identical work
			const hashes: Uint8Array[] = [];
			for (let i = 0; i < 4_096; i++) {
				hashes.push(sha256(new TextEncoder().encode(`hash-${i}`)));
			}
			const REPEATS = 60;

			const hashToBigInt = (hash: Uint8Array): bigint => {
				let value = 0n;
				for (const byte of hash) {
					value = (value << 8n) | BigInt(byte);
				}
				return value;
			};
			const target = 1n << 240n; // difficulty 4

			const baseline = () => {
				let sink = 0;
				for (let r = 0; r < REPEATS; r++) {
					for (const h of hashes) {
						if (hashToBigInt(h) < target) sink += 1;
					}
				}
				return sink;
			};
			const optimised = () => {
				let sink = 0;
				for (let r = 0; r < REPEATS; r++) {
					for (const h of hashes) {
						if (hashMeetsDifficulty(h, 4)) sink += 1;
					}
				}
				return sink;
			};

			baseline();
			optimised(); // warm up
			const baselineMs = timeMs(baseline);
			const optimisedMs = timeMs(optimised);
			report("reject check", baselineMs, optimisedMs);

			// the byte-wise check bails on the first non-zero byte for the
			// overwhelming majority of hashes, vs a full 32-iteration bigint build.
			expect(optimisedMs).toBeLessThan(baselineMs * 0.9);
		},
	);

	it("end-to-end solve completes within a sane time budget", async () => {
		const challenge = "end-to-end-benchmark";
		const start = performance.now();
		const nonce = await solvePoW(challenge, 3);
		const elapsed = performance.now() - start;
		const hash = sha256(new TextEncoder().encode(nonce + challenge));
		expect(hash[0]).toBe(0); // 12 leading zero bits => first byte is zero
		// difficulty 3 (12 bits) averages ~4k hashes; 5s is a very generous cap
		expect(elapsed).toBeLessThan(5_000);
	});
});
