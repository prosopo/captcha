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

import { readFileSync } from "node:fs";
import {
	CaptchaMerkleTree,
	computeCaptchaSolutionHash,
} from "@prosopo/datasets";
import { type CaptchaSolution, InputMethod } from "@prosopo/types";
import { describe, expect, test } from "vitest";
import { commitmentId } from "../index.js";

interface SolutionHashVector {
	captcha: CaptchaSolution;
	result: string;
}

const solutionHashVectors: SolutionHashVector[] = JSON.parse(
	readFileSync(
		new URL("../../../datasets/rust/equivalence/vectors.json", import.meta.url),
		"utf8",
	),
).solutionHashes;

const typescriptCommitmentId = (solutions: CaptchaSolution[]): string => {
	const tree: CaptchaMerkleTree = new CaptchaMerkleTree();
	tree.build(solutions.map(computeCaptchaSolutionHash));
	const root: string | undefined = tree.root?.hash;
	if (root === undefined) {
		throw new Error("no root");
	}
	return root;
};

const mulberry32 = (seed: number): (() => number) => {
	let state: number = seed;
	return (): number => {
		state = (state + 0x6d2b79f5) | 0;
		let t: number = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
};

const STRINGS: string[] = [
	"",
	"a",
	"B",
	"10",
	"9",
	"0x01",
	"0x4b9283abfe050c9353c862a47b92f8d21514b75433cb6ca3c5cf3cb65b436805",
	"｡",
	"𐀀",
	"😀",
	"é",
	"é",
	'"\\\n',
	"x".repeat(5000),
];

const randomSolutions = (
	random: () => number,
	count: number,
): CaptchaSolution[] => {
	const pick = (): string => {
		if (random() < 0.5) {
			return `0x${Math.floor(random() * 2 ** 52)
				.toString(16)
				.padStart(64, "0")}`;
		}
		return STRINGS[Math.floor(random() * STRINGS.length)] ?? "";
	};
	return Array.from({ length: count }, (): CaptchaSolution => {
		const solution: CaptchaSolution = {
			captchaId: pick(),
			captchaContentId: pick(),
			solution: Array.from({ length: Math.floor(random() * 6) }, pick),
			salt: pick(),
		};
		if (random() < 0.3) {
			solution.inputMethods =
				random() < 0.5
					? [InputMethod.pointer]
					: [InputMethod.keyboard, InputMethod.pointer];
		}
		return solution;
	});
};

describe("commitmentId", () => {
	test("is the solution hash for one solution, for every datasets vector", async () => {
		expect(solutionHashVectors.length).toBeGreaterThan(0);
		for (const vector of solutionHashVectors) {
			expect(await commitmentId([vector.captcha])).toBe(vector.result);
		}
	});

	test("gives the TypeScript root for random solution sets of every size up to 70", async () => {
		const random: () => number = mulberry32(20261022);
		for (let count = 1; count <= 70; count++) {
			for (let round = 0; round < 5; round++) {
				const solutions: CaptchaSolution[] = randomSolutions(random, count);
				const before: string = JSON.stringify(solutions);
				const expected: string = typescriptCommitmentId(
					structuredClone(solutions),
				);
				expect(await commitmentId(solutions)).toBe(expected);
				expect(JSON.stringify(solutions)).toBe(before);
			}
		}
	});

	test("gives the TypeScript root when solutions repeat", async () => {
		const [solution] = randomSolutions(mulberry32(7), 1);
		if (solution === undefined) {
			throw new Error("no solution");
		}
		for (let count = 1; count <= 9; count++) {
			const solutions: CaptchaSolution[] = Array.from(
				{ length: count },
				(): CaptchaSolution => structuredClone(solution),
			);
			expect(await commitmentId(solutions)).toBe(
				typescriptCommitmentId(structuredClone(solutions)),
			);
		}
	});

	test("refuses an empty set, as procaptcha does before building its tree", async () => {
		await expect(commitmentId([])).rejects.toThrow(
			"No captcha solutions to commit to",
		);
	});

	// The TypeScript hashes a lone surrogate as U+FFFD. JSON.stringify escapes it, and the
	// Rust's strings cannot hold one, so the WASM refuses it. Solutions are hex hashes and
	// ids the provider issued, so the widget never commits to one.
	test("refuses a lone surrogate the TypeScript would hash", async () => {
		const solutions: CaptchaSolution[] = [
			{ captchaId: "\ud800", captchaContentId: "", solution: [], salt: "" },
		];
		expect(typescriptCommitmentId(solutions)).toMatch(/^0x[0-9a-f]{64}$/);
		await expect(commitmentId(solutions)).rejects.toThrow();
	});
});
