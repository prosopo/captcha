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

// Records src/lodash.ts (seedrandom and the seeded lodash) into seeded-vectors.json, which
// seeded_equivalence.rs replays against the Rust.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import seedrandom from "seedrandom";
import { rng, seedLodash } from "../../src/lodash.js";

// The vectors are what Node 24, the production runtime, produces.
if (!process.version.startsWith("v24.")) {
	throw new Error(`this generator must run on Node 24 (the production runtime), not ${process.version}`);
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

const SEEDS: (number | string)[] = [
	0,
	1,
	42,
	-1,
	1.5,
	1e21,
	Number.NaN,
	"",
	"hello",
	"pässwörd",
	"😀 emoji",
	"x".repeat(300),
	Array.from({ length: 600 }, (_, i) => String.fromCharCode(32 + (i % 90))).join(""),
	"\u0000￿",
];

const range = (n: number): number[] => [...Array(n).keys()];

const generators: Json[] = SEEDS.map((seed) => {
	const text = seed.toString();
	const prng = seedrandom(text);
	const doubles = range(40).map(() => prng());
	const int32s = range(20).map(() => prng.int32());
	const quicks = range(20).map(() => prng.quick());
	const r = rng(seed);
	const ints = range(20).map(() => r.int());
	const bools = range(20).map(() => r.bool());
	const r2 = rng(seed);
	const mixed = range(10).flatMap(() => [r2.double(), r2.float(), r2.int32()]);
	return { seed: text, doubles, int32s, quicks, ints, bools, mixed };
});

type Op = { op: "random"; lower: number; upper: number } | { op: "shuffle"; array: number[] } | { op: "sampleSize"; array: number[]; n: number };

const OPS: Op[] = [
	{ op: "random", lower: 0, upper: 10 },
	{ op: "random", lower: 5, upper: 2 },
	{ op: "random", lower: 0, upper: 0 },
	{ op: "random", lower: -3, upper: 3 },
	{ op: "random", lower: 1.5, upper: 3 },
	{ op: "random", lower: 0, upper: 0.5 },
	{ op: "random", lower: -2.25, upper: -1 },
	{ op: "random", lower: 1, upper: 9 },
	{ op: "random", lower: Number.POSITIVE_INFINITY, upper: 3 },
	...range(13).map((n): Op => ({ op: "shuffle", array: range(n) })),
	...[-1, 0, 1, 3, 9, 14, 2.7, Number.NaN].map((n): Op => ({ op: "sampleSize", array: range(9).map((i) => i * 10), n })),
	{ op: "sampleSize", array: [], n: 3 },
	...range(20).map((i): Op => ({ op: i % 2 ? "random" : "shuffle", lower: 1, upper: 8, array: range(9) }) as Op),
];

const lodashRuns: Json[] = SEEDS.map((seed) => {
	const _ = seedLodash(seed);
	const results: Json[] = OPS.map((op) => {
		switch (op.op) {
			case "random":
				return _.random(op.lower, op.upper);
			case "shuffle":
				return _.shuffle(op.array);
			case "sampleSize":
				return _.sampleSize(op.array, op.n);
		}
	});
	return { seed: seed.toString(), results };
});

const output = fileURLToPath(new URL("./seeded-vectors.json", import.meta.url));
writeFileSync(
	output,
	`${JSON.stringify({ generators, ops: OPS.map((op) => ({ ...op, lower: "lower" in op ? String(op.lower) : null, upper: "upper" in op ? String(op.upper) : null, n: "n" in op ? String(op.n) : null })), lodashRuns }, null, "\t")}\n`,
);
process.stdout.write(`wrote ${generators.length} generators and ${lodashRuns.length} lodash runs of ${OPS.length} calls\n`);
