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

// Micro-benchmark: native merkle vs the JS @prosopo/datasets impl.
// Run: node packages/native-merkle/bench.mjs
import { createRequire } from "node:module";
import { performance } from "node:perf_hooks";

const require = createRequire(import.meta.url);
const native = require("./index.js");
const { CaptchaMerkleTree, computeCaptchaSolutionHash } = await import(
	"@prosopo/datasets"
);

function makeSolutions(count) {
	const solutions = [];
	for (let i = 0; i < count; i++) {
		solutions.push({
			captchaId: `0x${i.toString(16).padStart(64, "0")}`,
			captchaContentId: `0xcid${i.toString(16).padStart(61, "0")}`,
			salt: `0xsalt${i.toString(16).padStart(60, "0")}`,
			solution: ["a", "b", "c", "d", "e", "f", "g", "h", "i"].map(
				(c) => `${c}${i}`,
			),
		});
	}
	return solutions;
}

const N_ITER = 20_000;
const SOL_COUNT = 9;

const solutions = makeSolutions(SOL_COUNT);

function runJs() {
	const hashed = solutions.map((s) => computeCaptchaSolutionHash(s));
	const tree = new CaptchaMerkleTree();
	tree.build(hashed);
	return tree.root?.hash;
}

function runNative() {
	const hashed = solutions.map((s) =>
		native.computeCaptchaSolutionHash(
			s.captchaId,
			s.captchaContentId,
			s.solution,
			s.salt,
		),
	);
	const layers = native.buildMerkleLayers(hashed);
	return layers[layers.length - 1][0];
}

const jsRoot = runJs();
const nativeRoot = runNative();
console.log(`JS  root: ${jsRoot}`);
console.log(`RS  root: ${nativeRoot}`);
if (jsRoot !== nativeRoot) {
	console.error("PARITY MISMATCH");
	process.exit(1);
}

function bench(label, fn) {
	for (let i = 0; i < 500; i++) fn();
	const start = performance.now();
	for (let i = 0; i < N_ITER; i++) fn();
	const ms = performance.now() - start;
	const ns = (ms * 1e6) / N_ITER;
	const ops = (N_ITER / ms) * 1000;
	console.log(
		`${label.padEnd(10)} ${ms.toFixed(1).padStart(8)} ms   ${ns.toFixed(0).padStart(7)} ns/op   ${ops.toFixed(0).padStart(10)} ops/s`,
	);
	return ms;
}

console.log(`\nSolutions per commit: ${SOL_COUNT}   iterations: ${N_ITER}`);
const jsMs = bench("JS", runJs);
const nsMs = bench("Rust napi", runNative);
console.log(`\nSpeedup: ${(jsMs / nsMs).toFixed(2)}x`);
