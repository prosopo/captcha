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

// Writes pairs-vectors.json: pairs.ts from the TS on Node 24 over crafted and seeded random
// inputs. Each case runs the whole chain dappUserSolution runs (peel the checkbox, pair the
// rest, resolve and peel the input methods, judge the selections), and each function alone.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { InputMethod } from "@prosopo/types";
import {
	constructPairList,
	containsIdenticalPairs,
	keyboardSelectionHasPosition,
	peelCheckboxInputMethod,
	peelCheckboxPrefix,
	resolveInputMethods,
	selectionsLookScripted,
} from "../../src/pairs.js";

if (!process.version.startsWith("v24.")) {
	throw new Error(
		`this generator must run on Node 24 (the production runtime), not ${process.version}`,
	);
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

const outcome = (run: () => unknown): Json => {
	try {
		return { ok: (run() ?? null) as Json };
	} catch (error) {
		return { thrown: String((error as Error).message) };
	}
};

let state = 20261022;
const random = (): number => {
	state = (state + 0x6d2b79f5) | 0;
	let t = Math.imul(state ^ (state >>> 15), 1 | state);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = <T>(items: T[]): T =>
	items[Math.floor(random() * items.length)] as T;

type Case = {
	flat: number[][];
	lengths: number[];
	declared: (InputMethod[] | null)[];
};
const crafted: Case[] = [
	{ flat: [], lengths: [], declared: [] },
	{
		flat: [
			[10, 20, 30, 40],
			[50, 60],
		],
		lengths: [2, 1],
		declared: [null, null],
	},
	{
		flat: [
			[7, 13, 10, 20, 30, 40],
			[50, 60],
		],
		lengths: [2, 1],
		declared: [null, null],
	},
	{
		flat: [
			[0, 0, 0, 0, 0, 0],
			[0, 0, 0, 0],
		],
		lengths: [2, 2],
		declared: [
			["keyboard", "keyboard", "keyboard"] as InputMethod[],
			["keyboard", "keyboard"] as InputMethod[],
		],
	},
	{
		flat: [
			[0, 0, 0, 0, 0, 0],
			[0, 0, 0, 0],
		],
		lengths: [2, 2],
		declared: [null, null],
	},
	{
		flat: [[0, 0, 5, 5]],
		lengths: [1],
		declared: [["keyboard", "keyboard"] as InputMethod[]],
	},
	{
		flat: [[5, 5, 0, 0]],
		lengths: [1],
		declared: [["pointer", "keyboard"] as InputMethod[]],
	},
	{
		flat: [[5, 5, 6, 6]],
		lengths: [2],
		declared: [["pointer"] as InputMethod[]],
	},
	{ flat: [[1, 2, 3]], lengths: [1], declared: [null] },
	{
		flat: [
			[1, 2, 3, 4],
			[1, 2],
		],
		lengths: [2, 1],
		declared: [null, ["keyboard"] as InputMethod[]],
	},
	{
		flat: [
			[1, 2, 3, 4],
			[1, 2],
		],
		lengths: [2, 1],
		declared: [null, null],
	},
	{ flat: [[1.5, 2.5, 1.5, 2.5]], lengths: [2], declared: [null] },
	{ flat: [[1, 2]], lengths: [], declared: [] },
	{
		flat: [
			[9, 9, 1, 2],
			[3, 4],
		],
		lengths: [1, 1],
		declared: [[] as InputMethod[], null],
	},
];
const randomCases: Case[] = Array.from({ length: 400 }, (): Case => {
	const count = 1 + Math.floor(random() * 4);
	const lengths = Array.from({ length: count }, () => Math.floor(random() * 4));
	const withCheckbox = random() < 0.5;
	const flat = lengths.map((length, index) => {
		const pairs =
			length +
			(index === 0 && withCheckbox ? 1 : 0) +
			(random() < 0.05 ? 1 : 0);
		const values = Array.from({ length: pairs * 2 }, () =>
			random() < 0.3 ? 0 : pick([0, 1, 2, 3, 50, 120, 299]),
		);
		return random() < 0.03 ? values.slice(1) : values;
	});
	const declared = flat.map((list) => {
		if (random() < 0.4) return null;
		const size =
			random() < 0.1 ? list.length / 2 + 1 : Math.floor(list.length / 2);
		return Array.from({ length: Math.max(0, size) }, () =>
			pick([InputMethod.pointer, InputMethod.keyboard]),
		);
	});
	return { flat, lengths, declared };
});

const chains: Json[] = [...crafted, ...randomCases].map((c) => {
	const declared = c.declared.map((d) => d ?? undefined);
	const result = outcome(() => {
		const { checkbox, flat } = peelCheckboxPrefix(c.flat, c.lengths);
		const shapePairs = flat.map((list) => constructPairList(list));
		const pairs = checkbox ? [[checkbox], ...shapePairs] : shapePairs;
		const raw = resolveInputMethods(c.flat, declared);
		const inputMethods = raw && checkbox ? peelCheckboxInputMethod(raw) : raw;
		return {
			checkbox: checkbox ?? null,
			pairs,
			inputMethods: inputMethods ?? null,
			keyboardHasPosition: inputMethods
				? keyboardSelectionHasPosition(pairs, inputMethods)
				: null,
			identicalWithMethods: containsIdenticalPairs(pairs, inputMethods),
			identical: containsIdenticalPairs(pairs),
			scripted: selectionsLookScripted(pairs, inputMethods),
		};
	});
	return { ...c, result } as unknown as Json;
});

const out = fileURLToPath(new URL("pairs-vectors.json", import.meta.url));
writeFileSync(
	out,
	`${JSON.stringify({ node: process.version, chains }, null, "\t")}\n`,
);
console.log(`wrote ${out}`);
