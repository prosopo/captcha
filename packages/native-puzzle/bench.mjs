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

// Micro-benchmark: native background synthesis vs the JS @prosopo/puzzle-assets
// implementation, plus a fidelity check that the two agree byte for byte.
// Run: node packages/native-puzzle/bench.mjs
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import os from "node:os";

const require = createRequire(import.meta.url);
const native = require("./index.js");
const { createPrng, generateBackground, DEFAULT_GEOMETRY } = await import(
	"@prosopo/puzzle-assets"
);

const { width, height } = DEFAULT_GEOMETRY;
const ITERATIONS = 500;
const WARMUP = 100;
const FIDELITY_SEEDS = 200;

const seeds = Array.from({ length: ITERATIONS + WARMUP }, () =>
	randomBytes(16),
);

const variants = {
	"JS   (puzzle-assets)": (seed) =>
		generateBackground(createPrng(seed), width, height).data,
	"Rust (exact)": (seed) => native.generateBackground(seed, width, height),
	"Rust (separable)": (seed) =>
		native.generateBackgroundSeparable(seed, width, height),
};

for (const run of Object.values(variants)) {
	for (let i = 0; i < WARMUP; i++) run(seeds[i]);
}

const timings = {};
for (const [name, run] of Object.entries(variants)) {
	const samples = [];
	for (let i = 0; i < ITERATIONS; i++) {
		const start = process.hrtime.bigint();
		run(seeds[WARMUP + i]);
		samples.push(Number(process.hrtime.bigint() - start) / 1e6);
	}
	samples.sort((a, b) => a - b);
	timings[name] = {
		mean: samples.reduce((a, b) => a + b, 0) / samples.length,
		p50: samples[Math.floor(samples.length * 0.5)],
		p99: samples[Math.floor(samples.length * 0.99)],
	};
}

const pad = (n) => n.toFixed(3).padStart(8);
const baseline = timings["JS   (puzzle-assets)"].mean;

console.log(`node ${process.version} | ${os.cpus()[0].model}`);
console.log(`${width}x${height} background, ${ITERATIONS} iterations\n`);
console.log("                           mean      p50      p99   speedup");
for (const [name, t] of Object.entries(timings)) {
	console.log(
		`${name.padEnd(22)} ${pad(t.mean)} ${pad(t.p50)} ${pad(t.p99)}   ${(
			baseline / t.mean
		).toFixed(1)}x`,
	);
}

// The speed is only worth having if the picture is the same one.
const divergences = { "Rust (exact)": 0, "Rust (separable)": 0 };
for (let i = 0; i < FIDELITY_SEEDS; i++) {
	const seed = randomBytes(16);
	const reference = generateBackground(createPrng(seed), width, height).data;
	for (const name of Object.keys(divergences)) {
		if (!variants[name](seed).equals(reference)) divergences[name] += 1;
	}
}
console.log(`\nfidelity over ${FIDELITY_SEEDS} random seeds:`);
for (const [name, bad] of Object.entries(divergences)) {
	console.log(
		`  ${name.padEnd(20)} ${FIDELITY_SEEDS - bad}/${FIDELITY_SEEDS} byte-identical to the JS`,
	);
}
