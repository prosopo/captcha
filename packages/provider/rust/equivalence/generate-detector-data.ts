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

// Writes detector-data-vectors.json: getBotScore.ts's `sanitiseDetectorData` from the TS on
// Node 24 over crafted bags (every cap at and past its edge, keys Mongo refuses, UTF-16 lengths
// with astral characters, integer-like keys) and seeded random nested ones.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { sanitiseDetectorData } from "../../src/tasks/detection/getBotScore.js";

if (!process.version.startsWith("v24.")) {
	throw new Error(
		`this generator must run on Node 24 (the production runtime), not ${process.version}`,
	);
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

let state = 7;
const random = (): number => {
	state = (state + 0x6d2b79f5) | 0;
	let t = Math.imul(state ^ (state >>> 15), 1 | state);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const keys = [
	"a",
	"b",
	"2",
	"10",
	"x.y",
	"$bad",
	"",
	"k".repeat(64),
	"k".repeat(65),
	"😀".repeat(32),
	"😀".repeat(33),
	"nul\u0000",
];
const leaf = (): Json => {
	const r = random();
	if (r < 0.2) return null;
	if (r < 0.4) return random() < 0.5;
	if (r < 0.6) return Math.floor(random() * 1000) / 7;
	if (r < 0.8)
		return "s".repeat(random() < 0.05 ? 520 : Math.floor(random() * 20));
	return "😀".repeat(random() < 0.05 ? 260 : Math.floor(random() * 10));
};
const tree = (depth: number): Json => {
	if (depth > 5 || (depth > 0 && random() < 0.45)) return leaf();
	const wide = depth === 0 && random() < 0.2;
	if (depth > 0 && random() < 0.4)
		return Array.from({ length: Math.floor(random() * (wide ? 80 : 8)) }, () =>
			tree(depth + 1),
		);
	const out: Record<string, Json> = {};
	const count = Math.floor(random() * (wide ? 70 : 8));
	for (let i = 0; i < count; i++)
		out[
			random() < 0.3
				? (keys[Math.floor(random() * keys.length)] as string)
				: `k${i}`
		] = tree(depth + 1);
	return out;
};
const crafted: Json[] = [
	null,
	7,
	"text",
	[1, 2],
	{},
	{ "x.y": 1, $a: 2, "": 3 },
	{ a: 1, b: [1, [2, [3, [4, [5]]]]] },
	{ a: { b: { c: { d: { e: 1 } } } } },
	{ a: { b: { c: { d: 1 } } } },
	{ a: { b: { c: [1] } } },
	{ a: { b: { c: { d: [] } } } },
	{ long: "x".repeat(600), astral: "😀".repeat(300), exact: "y".repeat(512) },
	Object.fromEntries(Array.from({ length: 70 }, (_, i) => [`k${i}`, i])),
	Object.fromEntries(
		Array.from({ length: 70 }, (_, i) => [i % 2 ? `$k${i}` : `k${i}`, i]),
	),
	{ list: Array.from({ length: 70 }, (_, i) => i) },
	{
		wide: Array.from({ length: 64 }, () => Array.from({ length: 64 }, () => 1)),
	},
	{ big: Array.from({ length: 64 }, () => "z".repeat(200)) },
	{ "10": 1, "2": 2, b: 3, a: 4, "-1": 5, "01": 6 },
	{ nested: { ["😀".repeat(32)]: 1, ["😀".repeat(33)]: 2 } },
	// JS enumerates integer-like keys first, so these three are kept ahead of named keys.
	Object.fromEntries([
		...Array.from({ length: 64 }, (_, i) => [`k${i}`, i]),
		["7", 7],
		["3", 3],
		["100", 100],
	]),
];
const cases: Json[] = [
	...crafted,
	...Array.from({ length: 300 }, () => tree(0)),
].map((input) => ({
	input,
	result: (sanitiseDetectorData(input) ?? null) as Json,
}));
const out = fileURLToPath(
	new URL("detector-data-vectors.json", import.meta.url),
);
writeFileSync(out, `${JSON.stringify({ node: process.version, cases })}\n`);
console.log(`wrote ${out}`);
