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

// Records the datasets package's behaviour into vectors.json, which equivalence.rs replays
// against the Rust. Inputs are fixed or drawn from a seeded generator. Where the TS sorts a
// caller's array in place, the array is recorded after the call as well.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ProsopoBaseError } from "@prosopo/common";
import {
	type AssetsResolver,
	type Captcha,
	type CaptchaSolution,
	type CaptchaWithoutId,
	type DatasetRaw,
	DatasetWithIdsAndTreeSchema,
	type Item,
	type MerkleProof,
	type SolutionRecord,
} from "@prosopo/types";
import { hexHash, hexHashArray } from "@prosopo/util-crypto";
import {
	CaptchaMerkleTree,
	NO_SOLUTION_VALUE,
	assetTokenBase,
	assetTokenOptionsFromEnv,
	buildDataset,
	compareCaptchaSolutions,
	computeCaptchaHash,
	computeCaptchaSolutionHash,
	computeItemHash,
	computePendingRequestHash,
	encodeAssetToken,
	getSolutionValueToHash,
	matchItemsToSolutions,
	parseAndSortCaptchaSolutions,
	parseCaptchaAssets,
	parseCaptchaDataset,
	signAssetUrl,
	sortAndComputeHashes,
	validateDatasetContent,
	verifyProof,
} from "../../src/captcha/index.js";
import {
	datasetWithIndexSolutions,
	datasetWithSolutionHashes,
} from "../../src/tests/mocks/data/captchas.js";

if (!process.version.startsWith("v24.")) {
	throw new Error(
		`this generator must run on Node 24 (the production runtime), not ${process.version}`,
	);
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

for (const method of ["log", "info", "warn", "error", "debug"] as const) {
	console[method] = (): void => {};
}

let prngState = 0x64617461;
const next = (): number => {
	prngState ^= prngState << 13;
	prngState ^= prngState >>> 17;
	prngState ^= prngState << 5;
	return (prngState >>> 0) / 0x1_0000_0000;
};
const int = (n: number): number => Math.floor(next() * n);
const pick = <T>(items: readonly T[]): T => {
	const item: T | undefined = items[int(items.length)];
	if (item === undefined) throw new Error("empty");
	return item;
};

const clone = <T>(value: T): T => structuredClone(value);
const json = (value: unknown): Json =>
	JSON.parse(JSON.stringify(value ?? null)) as Json;

/** The parts of a thrown value the Rust reproduces: class, key, context, and what it wraps. */
const describeError = (e: unknown): Json => {
	if (typeof e === "string") {
		return { string: e };
	}
	if (e instanceof ProsopoBaseError) {
		const { error, ...rest } = (e.context ?? {}) as {
			error?: unknown;
			[key: string]: unknown;
		};
		return {
			class: e.constructor.name,
			key: e.translationKey ?? null,
			context: json(rest),
			...(error === undefined ? {} : { error: describeError(error) }),
		};
	}
	if ((e as Error).name === "ZodError") {
		return {
			class: "ZodError",
			issues: json((e as { issues: unknown }).issues),
		};
	}
	return { class: (e as Error).name, message: (e as Error).message };
};

type Outcome = { result: Json } | { error: Json };
const outcome = (fn: () => Json): Outcome => {
	try {
		return { result: fn() };
	} catch (e) {
		return { error: describeError(e) };
	}
};
const asyncOutcome = async (fn: () => Promise<Json>): Promise<Outcome> => {
	try {
		return { result: await fn() };
	} catch (e) {
		return { error: describeError(e) };
	}
};

const treeState = (tree: CaptchaMerkleTree): Json => ({
	leaves: json(tree.leaves),
	layers: json(tree.layers),
	root: json(tree.root),
});

// ---------------------------------------------------------------- merkle

const LEAF_SETS: string[][] = [
	...Array.from({ length: 40 }, (_: unknown, size: number): string[] =>
		Array.from(
			{ length: size + 1 },
			(_: unknown, i: number): string => `l${size + 1}-${i}`,
		),
	),
	["1", "2", "3"],
	Array.from({ length: 16 }, (_: unknown, i: number): string => String(i + 1)),
	Array.from({ length: 17 }, (_: unknown, i: number): string => String(i + 1)),
	["a", "a"],
	["a", "b", "a"],
	["x", "y", "x", "y", "z"],
	[""],
	["", ""],
	["", "a", ""],
	["é", "\u{1f600}", "\u{ff61}", "\u{10000}"],
	["a", "b", hexHashArray(["a", "b"])],
	["a", "b", "c", hexHashArray(["c", "c"])],
	["only"],
];

const proofCandidates = (
	tree: CaptchaMerkleTree,
	leaves: string[],
): string[] => [
	...new Set([
		...leaves,
		"not-a-leaf",
		...(tree.layers[1] ?? []).slice(0, 2),
		...(tree.root ? [tree.root.hash] : []),
	]),
];

const proofOutcomes = (tree: CaptchaMerkleTree, candidates: string[]): Json =>
	candidates.map((leaf: string): Json => {
		const result: Outcome = outcome((): Json => json(tree.proof(leaf)));
		const verified: Json =
			"result" in result && tree.root
				? {
						root: verifyProof(
							leaf,
							result.result as MerkleProof,
							tree.root.hash,
						),
						wrongRoot: verifyProof(
							leaf,
							result.result as MerkleProof,
							`${tree.root.hash}0`,
						),
					}
				: null;
		return { leaf, proof: result, verified };
	});

const merkleBuilds: Json[] = LEAF_SETS.map((leaves: string[]): Json => {
	const tree = new CaptchaMerkleTree();
	tree.build(leaves);
	return {
		leaves,
		state: treeState(tree),
		proofs: proofOutcomes(tree, proofCandidates(tree, leaves)),
	};
});

const emptyBuild: Outcome = outcome((): Json => {
	new CaptchaMerkleTree().build([]);
	return null;
});

const REBUILDS: [string[], string[]][] = [
	[
		["1", "2", "3"],
		["4", "5"],
	],
	[["a"], ["b"]],
	[
		["a", "b"],
		["a", "b"],
	],
];
const merkleRebuilds: Json[] = REBUILDS.map(
	([first, second]: [string[], string[]]): Json => {
		const tree = new CaptchaMerkleTree();
		tree.build(first);
		tree.build(second);
		return {
			first,
			second,
			state: treeState(tree),
			proofs: proofOutcomes(tree, [...first, ...second, "zz"]),
		};
	},
);

const fresh = new CaptchaMerkleTree();
const merkleFresh: Json = {
	getRoot: outcome((): Json => json(fresh.getRoot())),
	proof: outcome((): Json => json(fresh.proof("a"))),
};

const HYDRATIONS: string[][][] = [
	[],
	[[]],
	[["a"]],
	[["a", "b"], ["zzz"]],
	[["a", "b", "c"], ["p", "q"], ["r"]],
	[["a", "b", "c"], [], ["r"]],
	[
		["a", "b"],
		["r", "s"],
	],
	new CaptchaMerkleTree().layers,
	(() => {
		const tree = new CaptchaMerkleTree();
		tree.build(["1", "2", "3", "4", "5"]);
		return tree.layers;
	})(),
];
const merkleHydrations: Json[] = HYDRATIONS.map((layers: string[][]): Json => {
	const tree = new CaptchaMerkleTree();
	const hydrated: Outcome = outcome((): Json => {
		tree.hydrateFromLayers(clone(layers));
		return null;
	});
	return {
		layers,
		hydrated,
		state: treeState(tree),
		proofs: proofOutcomes(tree, [...new Set([...layers.flat(), "zz"])]),
	};
});

const VERIFY_CASES: [string, string[][], string][] = [
	["leaf", [], "root"],
	["leaf", [["root", "x"]], "root"],
	["junk", [["junk"]], "junk"],
	["a", [["a"]], "a"],
	["a", [["a", "b", "c"], ["r"]], "r"],
	["a", [["b", "c"], [hexHashArray(["b", "c"])]], hexHashArray(["b", "c"])],
	["a", [["a", "b"], [hexHashArray(["a", "b"])]], hexHashArray(["a", "b"])],
	["a", [["b", "a"], [hexHashArray(["b", "a"])]], hexHashArray(["b", "a"])],
	[
		"a",
		[
			["a", "b"],
			[hexHashArray(["a", "b"]), "extra"],
		],
		hexHashArray(["a", "b"]),
	],
	["a", [["a", "b"], ["other"]], hexHashArray(["a", "b"])],
];
const merkleVerify: Json[] = VERIFY_CASES.map(
	([leaf, proof, root]: [string, string[][], string]): Json => ({
		leaf,
		proof,
		root,
		result: verifyProof(leaf, proof as MerkleProof, root),
	}),
);
{
	const tree = new CaptchaMerkleTree();
	const leaves: string[] = Array.from(
		{ length: 13 },
		(_: unknown, i: number): string => `m${i}`,
	);
	tree.build(leaves);
	const root: string = tree.getRoot().hash;
	for (let i = 0; i < 60; i++) {
		const leaf: string = pick(leaves);
		const proof: string[][] = clone(tree.proof(leaf));
		const layer: string[] | undefined = proof[int(proof.length)];
		if (layer && layer.length > 0) {
			const position: number = int(layer.length);
			const value: string = layer[position] ?? "";
			const mutation: number = int(4);
			if (mutation === 0) layer[position] = `${value.slice(0, -1)}0`;
			else if (mutation === 1) layer.reverse();
			else if (mutation === 2) layer.push(value);
			else proof.splice(int(proof.length), 1);
		}
		merkleVerify.push({
			leaf,
			proof,
			root,
			result: verifyProof(leaf, proof as MerkleProof, root),
		});
	}
}

// ---------------------------------------------------------------- captcha hashing

const hashedItem = (data: string): Item =>
	({ type: "text", data, hash: hexHash(data) }) as Item;
const ITEMS: Item[] = [
	"blah1",
	"blah2",
	"blah3",
	"blah4",
	"blah5",
	"blah6",
	"blah7",
	"blah8",
	"blah9",
].map(hashedItem);
const UNSORTED_ITEMS: Item[] = [...ITEMS].reverse();
const ITEMS_MISSING_HASH: Item[] = [
	ITEMS[0] as Item,
	{ type: "text", data: "x", hash: "" } as Item,
];

const SOLUTIONS: (string | number)[][] = [
	[],
	[3, 1, 2],
	[10, 2, 1],
	[0],
	["0xb", "0xa"],
	[2, "0x1"],
	["\u{ff61}", "\u{10000}", "a"],
	[-1, 1.5, 0],
	[ITEMS[2]?.hash ?? "", ITEMS[0]?.hash ?? ""],
];

const hashCaptchas: CaptchaWithoutId[] = [];
for (const items of [ITEMS, UNSORTED_ITEMS, [], ITEMS_MISSING_HASH]) {
	for (const solution of [undefined, ...SOLUTIONS]) {
		for (const [salt, target] of [
			["0x01010101010101010101010101010101", "bus"],
			["", ""],
		] as const) {
			hashCaptchas.push({
				salt,
				target,
				items,
				...(solution === undefined ? {} : { solution: solution as string[] }),
			});
		}
	}
}
const captchaHashes: Json[] = hashCaptchas.flatMap(
	(captcha: CaptchaWithoutId): Json[] =>
		[false, true].flatMap((includeSolution: boolean): Json[] =>
			[false, true].flatMap((includeSalt: boolean): Json[] =>
				[false, true].map((sortItemHashes: boolean): Json => {
					const input: CaptchaWithoutId = clone(captcha);
					const result: Outcome = outcome(
						(): Json =>
							computeCaptchaHash(
								input,
								includeSolution,
								includeSalt,
								sortItemHashes,
							),
					);
					return {
						captcha: json(captcha),
						includeSolution,
						includeSalt,
						sortItemHashes,
						result,
						after: json(input.solution),
					};
				}),
			),
		),
);

const solutionValues: Json[] = [undefined, ...SOLUTIONS].map(
	(solution: (string | number)[] | undefined): Json => {
		const input: (string | number)[] | undefined = clone(solution);
		return {
			solution: json(solution),
			result: json(getSolutionValueToHash(input as string[] | undefined)),
		};
	},
);

const MATCH_SOLUTIONS: (string | number)[][] = [
	[],
	[0, 1, 2],
	[8],
	[9],
	[20],
	[-1],
	[-10],
	[1.5],
	[ITEMS[3]?.hash ?? ""],
	["0x"],
	["0x1"],
	["0xab"],
	["0xAB"],
	["0xzz"],
	["ab"],
	[ITEMS[3]?.hash?.toUpperCase().replace("0X", "0x") ?? ""],
	[1, ITEMS[0]?.hash ?? ""],
];
const matches: Json[] = [];
for (const items of [ITEMS, [], undefined]) {
	for (const solutions of MATCH_SOLUTIONS) {
		matches.push({
			solutions,
			items: json(items),
			itemsUndefined: items === undefined,
			result: outcome(
				(): Json => json(matchItemsToSolutions(solutions as number[], items)),
			),
		});
	}
}

// ---------------------------------------------------------------- parsing

const mock = (name: string): Json =>
	JSON.parse(
		readFileSync(
			fileURLToPath(
				new URL(`../../src/tests/mocks/data/${name}.json`, import.meta.url),
			),
			"utf8",
		),
	) as Json;

const SALT = "0x0101010101010101010101010101010101";
const datasetItems = (prefix: string, count: number): Json =>
	Array.from(
		{ length: count },
		(_: unknown, i: number): Json => ({
			hash: hexHash(`${prefix}${i}`),
			data: `${prefix}${i}`,
			type: "text",
		}),
	);
const datasetCaptcha = (
	index: number,
	extra: { [key: string]: Json },
): Json => ({
	salt: `${SALT}${index}`,
	items: datasetItems(`c${index}-`, 9),
	target: `t${index}`,
	...extra,
});
const DATASETS: Json[] = [
	mock("captchas"),
	mock("captchas1"),
	mock("captchas2"),
	mock("captchas3"),
	mock("captchas4"),
	{
		format: "SelectAll",
		captchas: [
			datasetCaptcha(0, { solution: [2, 0, 1] }),
			datasetCaptcha(1, {}),
		],
	},
	{
		format: "SelectAll",
		datasetId: "0x01",
		datasetContentId: "0x02",
		contentTree: [["a"]],
		solutionTree: [["b"]],
		timeLimit: 30,
		captchas: [
			datasetCaptcha(0, {
				solution: [10, 2, 1],
				unlabelled: [3],
				timeLimit: 5,
			}),
			datasetCaptcha(1, { unlabelled: [4, 5] }),
			datasetCaptcha(2, {
				captchaId: "0xid",
				captchaContentId: "0xcid",
				solution: [],
			}),
		],
	},
	{
		format: "SelectAll",
		captchas: [datasetCaptcha(0, { solution: [9, -1, 20] })],
	},
	{ format: "SelectAll", captchas: [datasetCaptcha(0, { solution: [1.5] })] },
	{
		format: "SelectAll",
		captchas: [datasetCaptcha(0, { solution: ["0x01"] })],
	},
	{
		format: "SelectAll",
		captchas: [datasetCaptcha(0, { extra: 1 })],
		extra: true,
	},
	{ format: "Other", captchas: [] },
	{ format: "SelectAll", captchas: [] },
	{
		format: "SelectAll",
		captchas: [{ salt: "short", items: [], target: "x" }],
	},
	{ format: "SelectAll", captchas: [datasetCaptcha(0, { items: [] })] },
	{
		format: "SelectAll",
		captchas: [datasetCaptcha(0, { items: [{ data: "x", type: "text" }] })],
	},
	{ captchas: [] },
	null,
	[],
	"dataset",
];
const parsedDatasets: Json[] = DATASETS.map(
	(input: Json): Json => ({
		input,
		result: outcome(
			(): Json => json(parseCaptchaDataset(clone(input) as unknown as JSON)),
		),
	}),
);

const SOLUTION_SUBMISSIONS: Json[] = [
	[],
	[
		{
			captchaId: "1",
			captchaContentId: "1",
			solution: ["0x3", "0x1", "0x2"],
			salt: "0xsalt",
		},
	],
	[
		{
			captchaId: "2",
			captchaContentId: "2",
			solution: ["b", "a"],
			salt: "s",
			inputMethods: ["pointer", "keyboard"],
		},
		{
			captchaId: "1",
			captchaContentId: "1",
			solution: [],
			salt: "s",
			extra: 1,
		},
	],
	[{ captchaId: "1", salt: "0xsalt" }],
	[{ captchaId: 1, captchaContentId: "1", solution: [], salt: "s" }],
	[{ captchaId: "1", captchaContentId: "1", solution: [1], salt: "s" }],
	[
		{
			captchaId: "1",
			captchaContentId: "1",
			solution: [],
			salt: "s",
			inputMethods: ["mouse"],
		},
	],
	{ captchaId: "1" },
	null,
];
const parsedSolutions: Json[] = SOLUTION_SUBMISSIONS.map(
	(input: Json): Json => ({
		input,
		result: outcome(
			(): Json =>
				json(
					parseAndSortCaptchaSolutions(
						clone(input) as unknown as CaptchaSolution[],
					),
				),
		),
	}),
);

// ---------------------------------------------------------------- comparison

const HEX_IDS: string[] = Array.from(
	{ length: 6 },
	(_: unknown, i: number): string => hexHash(`id${i}`),
);
const ID_POOL: string[] = [...HEX_IDS, "a", "B", "b", "_x", "10", "9", "0X1"];
const HASH_POOL: string[] = (
	ITEMS.map((item: Item): string => item.hash ?? "") as string[]
).slice(0, 6);

const randomSolution = (): string[] =>
	Array.from({ length: int(5) }, (): string => pick(HASH_POOL));

const comparisons: Json[] = [];
for (let i = 0; i < 300; i++) {
	const count: number = int(4);
	const ids: string[] = Array.from({ length: count }, (): string =>
		pick(ID_POOL),
	);
	const received: CaptchaSolution[] = ids.map(
		(captchaId: string): CaptchaSolution => ({
			captchaId,
			captchaContentId: "0x01",
			solution: randomSolution(),
			salt: "0x01",
		}),
	);
	const shuffledIds: string[] =
		int(3) === 0
			? [...ids].reverse()
			: int(4) === 0
				? ids.map((): string => pick(ID_POOL))
				: [...ids];
	const solutionCount: number = int(5) === 0 ? count + 1 : count;
	const solutions: SolutionRecord[] = Array.from(
		{ length: solutionCount },
		(_: unknown, j: number): SolutionRecord => ({
			captchaId: shuffledIds[j] ?? pick(ID_POOL),
			captchaContentId: "0x01",
			solution:
				int(2) === 0
					? [...(received[j]?.solution ?? [])].reverse()
					: randomSolution(),
			salt: "0x01",
			datasetId: "0x",
			datasetContentId: "0x",
		}),
	);
	const totalImages: number = pick([9, 9, 9, 3, 1, 0]);
	const threshold: number = pick([0.8, 0.8, 0.5, 0, 1, 1.1, -1]);
	const r: CaptchaSolution[] = clone(received);
	const s: SolutionRecord[] = clone(solutions);
	comparisons.push({
		received: json(received),
		solutions: json(solutions),
		totalImages,
		threshold,
		result: compareCaptchaSolutions(r, s, totalImages, threshold),
		receivedAfter: json(r),
		solutionsAfter: json(s),
	});
}

const sortAndHash: Json[] = [];
for (let i = 0; i < 60; i++) {
	const ids: string[] = [
		...new Set(Array.from({ length: 1 + int(4) }, (): string => pick(ID_POOL))),
	];
	const received: CaptchaSolution[] = ids.map(
		(captchaId: string): CaptchaSolution => ({
			captchaId,
			captchaContentId: "0x01",
			solution: randomSolution(),
			salt: pick(["0x01", "0x02"]),
		}),
	);
	const storedIds: string[] =
		int(4) === 0
			? ids.map((): string => pick(ID_POOL))
			: [...ids].sort(() => next() - 0.5);
	const stored: Captcha[] = storedIds.map((captchaId: string): Captcha => {
		const captcha: Captcha = {
			captchaId,
			captchaContentId: "0x01",
			salt: pick(["0x01", "0x02"]),
			items: pick([ITEMS, UNSORTED_ITEMS, ITEMS_MISSING_HASH, []]),
			target: pick(["", "bus"]),
		};
		const solved: number = int(3);
		if (solved < 2) captcha.solved = solved === 0;
		return captcha;
	});
	if (int(5) === 0) Reflect.deleteProperty(stored[0] ?? {}, "items");
	const r: CaptchaSolution[] = clone(received);
	const s: Captcha[] = clone(stored);
	sortAndHash.push({
		received: json(received),
		stored: json(stored),
		result: outcome((): Json => json(sortAndComputeHashes(r, s))),
		receivedAfter: json(r),
		storedAfter: json(s),
	});
}

const solutionHashes: Json[] = [];
for (let i = 0; i < 60; i++) {
	const captcha: CaptchaSolution = {
		captchaId: pick(ID_POOL),
		captchaContentId: pick(["0x01", "", "\u{1f600}"]),
		solution:
			int(4) === 0 ? ["\u{ff61}", "\u{10000}", "b", "a"] : randomSolution(),
		salt: pick(["0x01", "", "s"]),
	};
	const input: CaptchaSolution = clone(captcha);
	solutionHashes.push({
		captcha: json(captcha),
		result: computeCaptchaSolutionHash(input),
		after: json(input),
	});
}

const pendingHashes: Json[] = [];
for (let i = 0; i < 60; i++) {
	const captchaIds: string[] = Array.from({ length: int(5) }, (): string =>
		pick([...ID_POOL, "\u{ff61}", "\u{10000}"]),
	);
	const userAccount: string | number[] =
		int(4) === 0
			? [1, 2, 300]
			: pick(["0x01", "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY", ""]);
	const salt: string = pick(["0x02", ""]);
	const ids: string[] = clone(captchaIds);
	pendingHashes.push({
		captchaIds,
		userAccount,
		salt,
		result: computePendingRequestHash(ids, userAccount, salt),
		after: ids,
	});
}

// ---------------------------------------------------------------- assets

const RESOLVERS: (Record<string, string> | undefined)[] = [
	undefined,
	{},
	{ a: "https://cdn/a", b: "" },
];
const assetResolutions: Json[] = [];
for (const mapping of RESOLVERS) {
	const resolver: AssetsResolver | undefined = mapping
		? ({
				resolveAsset: (data: string) => ({
					getURL: (): string => mapping[data] ?? data.toUpperCase(),
				}),
			} as unknown as AssetsResolver)
		: undefined;
	for (const item of [
		{ type: "image", data: "a", hash: "0x1" },
		{ type: "image", data: "b", hash: "0x2" },
		{ type: "text", data: "c", hash: "0x3" },
		{ type: "image", data: "", hash: "0x4" },
	]) {
		assetResolutions.push({
			mapping: mapping ?? null,
			item,
			result: json(parseCaptchaAssets(item as Item, resolver)),
		});
	}
}

const tokenBases: Json[] = [
	["key", "/a/b.webp", 1700000300, undefined],
	["key", "/a/b.webp", 1700000300, ""],
	["key", "/a/b.webp", 1700000300, "203.0.113.7"],
	["", "", 0, undefined],
	["kéy", "/\u{1f600}", 1e21, "::1"],
	["k", "/p", 1.5, undefined],
	["k", "/p", -5, undefined],
].map(
	([key, path, expires, ip]: (string | number | undefined)[]): Json => ({
		key: key as string,
		path: path as string,
		expires: expires as number,
		clientIp: (ip as string | undefined) ?? null,
		clientIpUndefined: ip === undefined,
		result: assetTokenBase(
			key as string,
			path as string,
			expires as number,
			ip as string | undefined,
		),
	}),
);

const tokenEncodings: Json[] = Array.from(
	{ length: 41 },
	(_: unknown, length: number): Json => {
		const bytes: number[] = Array.from({ length }, (): number => int(256));
		return { bytes, result: encodeAssetToken(Uint8Array.from(bytes)) };
	},
);

const URLS: string[] = [
	"https://prosopoimages.b-cdn.net/v5_dataset_flat/images/abc.webp",
	"https://prosopoimages.b-cdn.net/v5_dataset_flat/images/abc.webp?token=abc&expires=123",
	"https://prosopoimages.b-cdn.net/a.webp?x=1",
	"https://prosopoimages.b-cdn.net/a.webp?Token=1",
	"https://prosopoimages.b-cdn.net/a.webp?a=1&token",
	"https://prosopoimages.b-cdn.net/a.webp#frag",
	"http://localhost:4000/img/test_image_png_5.png",
	"https://host:443/a",
	"http://host:80/a",
	"https://HOST.example/A%20b/../c/./d",
	"https://hést.example/é x",
	"https://user:pw@host/a",
	"https://host",
	"https://[::1]:8080/p",
	"/local/fixture.webp",
	"not a url",
	"file:///a.webp",
	"ftp://host/a",
	"data:image/png;base64,AAAA",
	"",
	"HTTPS://host/a",
	" https://host/a ",
];
const SIGN_OPTIONS: { ttlSeconds?: number; clientIp?: string; now: number }[] =
	[
		{ now: 1_700_000_000_000 },
		{ now: 1_700_000_000_999, ttlSeconds: 60 },
		{ now: 1_700_000_000_000, ttlSeconds: 0, clientIp: "203.0.113.7" },
		{ now: 1_700_000_000_000, ttlSeconds: -10, clientIp: "" },
		{ now: 0.5, ttlSeconds: 0.5 },
		{ now: -1500 },
	];
const signedUrls: Json[] = [];
for (const url of URLS) {
	for (const options of SIGN_OPTIONS) {
		signedUrls.push({
			url,
			options: json(options),
			result: await signAssetUrl(url, {
				securityKey: "test-security-key",
				...(options.ttlSeconds === undefined
					? {}
					: { ttlSeconds: options.ttlSeconds }),
				...(options.clientIp === undefined
					? {}
					: { clientIp: options.clientIp }),
				now: (): number => options.now,
			}),
		});
	}
}

const ENV_KEYS: (string | undefined)[] = [undefined, "", "k"];
const ENV_TTLS: (string | undefined)[] = [
	undefined,
	"45",
	" 45",
	"45s",
	"0x10",
	"-5",
	"1e3",
	"",
	"abc",
	"99999999999999999999999",
	"+7",
	"\t9",
	"0",
];
const envOptions: Json[] = [];
for (const key of ENV_KEYS) {
	for (const ttl of ENV_TTLS) {
		if (key === undefined)
			Reflect.deleteProperty(process.env, "PROSOPO_ASSET_TOKEN_KEY");
		else process.env.PROSOPO_ASSET_TOKEN_KEY = key;
		if (ttl === undefined)
			Reflect.deleteProperty(process.env, "PROSOPO_ASSET_TOKEN_TTL_SECONDS");
		else process.env.PROSOPO_ASSET_TOKEN_TTL_SECONDS = ttl;
		envOptions.push({
			key: key ?? null,
			ttl: ttl ?? null,
			result: json(assetTokenOptionsFromEnv()),
		});
	}
}

// ---------------------------------------------------------------- building and downloading

const RAW_DATASETS: Json[] = [
	...parsedDatasets.flatMap((parsed: Json): Json[] => {
		const result: Outcome = (parsed as { result: Outcome }).result;
		return "result" in result ? [result.result] : [];
	}),
	json(datasetWithSolutionHashes),
	json(
		parseCaptchaDataset(clone(datasetWithIndexSolutions) as unknown as JSON),
	),
	{
		format: "SelectAll",
		captchas: [
			{
				...(datasetCaptcha(0, {}) as { [key: string]: Json }),
				solution: [4, 1].map(
					(i: number): string =>
						(datasetItems("c0-", 9) as { hash: string }[])[i]?.hash ?? "",
				),
			},
			{
				...(datasetCaptcha(1, {}) as { [key: string]: Json }),
				solution: ["0xnothex"],
			},
		],
	},
	{
		format: "SelectAll",
		captchas: [
			{
				...(datasetCaptcha(0, {}) as { [key: string]: Json }),
				solution: ["0x00"],
			},
		],
	},
	{
		format: "SelectAll",
		captchas: [
			{
				...(datasetCaptcha(0, {}) as { [key: string]: Json }),
				items: [{ data: "x", type: "text", hash: "" }],
				solution: [],
			},
		],
	},
	{
		format: "SelectAll",
		captchas: [
			{
				...(datasetCaptcha(0, {}) as { [key: string]: Json }),
				items: [{ data: "x", type: "text", hash: "" }],
			},
		],
	},
	{ format: "SelectAll", captchas: [] },
];
const builtDatasets: Json[] = [];
for (const input of RAW_DATASETS) {
	const raw: DatasetRaw = clone(input) as unknown as DatasetRaw;
	builtDatasets.push({
		input,
		result: await asyncOutcome(
			async (): Promise<Json> => json(await buildDataset(raw)),
		),
		stored: await asyncOutcome(
			async (): Promise<Json> =>
				json(
					DatasetWithIdsAndTreeSchema.parse(
						await buildDataset(clone(input) as unknown as DatasetRaw),
					),
				),
		),
	});
}

const requests: string[] = [];
const realFetch: typeof fetch = globalThis.fetch;
globalThis.fetch = (async (url: string | URL | Request): Promise<Response> => {
	const href: string = String(url);
	requests.push(href);
	if (!URL.canParse(href))
		throw new TypeError(`Failed to parse URL from ${href}`);
	if (href.includes("missing")) return new Response("nope", { status: 404 });
	if (href.includes("throws")) throw new TypeError("fetch failed");
	return new Response(
		new TextEncoder().encode(`bytes of ${new URL(href).pathname}`),
		{ status: 200 },
	);
}) as typeof fetch;
const NOW_MS = 1_750_000_000_000;
Date.now = (): number => NOW_MS;

const ITEM_CASES: Item[] = [
	{ type: "text", data: "hello", hash: "" },
	{ type: "text", data: "0x1234", hash: "" },
	{ type: "text", data: "", hash: "0xstale" },
	{ type: "image", data: "https://cdn.example/a.png", hash: "" },
	{ type: "image", data: "https://cdn.example/missing.png", hash: "" },
	{ type: "image", data: "https://cdn.example/throws.png", hash: "" },
	{
		type: "image",
		data: "https://cdn.example/b.png?token=t&expires=1",
		hash: "",
	},
	{ type: "image", data: "not a url", hash: "" },
	{ type: "audio", data: "x", hash: "" } as unknown as Item,
] as Item[];
const itemHashes: Json[] = [];
for (const key of [undefined, "k"]) {
	if (key === undefined)
		Reflect.deleteProperty(process.env, "PROSOPO_ASSET_TOKEN_KEY");
	else process.env.PROSOPO_ASSET_TOKEN_KEY = key;
	process.env.PROSOPO_ASSET_TOKEN_TTL_SECONDS = "60";
	for (const item of ITEM_CASES) {
		requests.length = 0;
		const result: Outcome = await asyncOutcome(
			async (): Promise<Json> => json(await computeItemHash(clone(item))),
		);
		itemHashes.push({
			key: key ?? null,
			item: json(item),
			result,
			requests: [...requests],
		});
	}
}
Reflect.deleteProperty(process.env, "PROSOPO_ASSET_TOKEN_KEY");

const validItems = (prefix: string): Item[] =>
	["a", "b", "c"].map(
		(data: string): Item =>
			({
				type: "text",
				data: `${prefix}${data}`,
				hash: hexHash(`${prefix}${data}`),
			}) as Item,
	);
const validationCases: Json[] = [
	{ format: "SelectAll", captchas: [] },
	{
		format: "SelectAll",
		captchas: [
			{ captchaId: "1", salt: SALT, target: "t", items: validItems("x") },
		],
	},
	{
		format: "SelectAll",
		captchas: [
			{ captchaId: "1", salt: SALT, target: "t", items: validItems("x") },
			{
				captchaId: "2",
				salt: SALT,
				target: "t",
				items: [
					...validItems("y").slice(0, 2),
					{ type: "text", data: "z", hash: "0xwrong" },
				],
			},
		],
	},
	{
		format: "SelectAll",
		captchas: [{ salt: SALT, target: "t", items: validItems("x") }],
	},
	{
		format: "SelectAll",
		captchas: [
			{ captchaId: "1", salt: SALT, target: "t", items: validItems("x") },
			{ captchaId: "1", salt: SALT, target: "t", items: validItems("y") },
		],
	},
	{
		format: "SelectAll",
		captchas: [
			{
				captchaId: "1",
				salt: SALT,
				target: "t",
				items: [
					{ type: "image", data: "https://cdn.example/a.png", hash: "0x0" },
				],
			},
		],
	},
	{
		format: "SelectAll",
		captchas: [
			{
				captchaId: "1",
				salt: SALT,
				target: "t",
				items: [
					{
						type: "image",
						data: "https://cdn.example/missing.png",
						hash: "0x0",
					},
				],
			},
		],
	},
];
const validations: Json[] = [];
for (const dataset of validationCases) {
	requests.length = 0;
	validations.push({
		dataset,
		result: await asyncOutcome(
			async (): Promise<Json> =>
				validateDatasetContent(
					clone(dataset) as unknown as Parameters<
						typeof validateDatasetContent
					>[0],
				),
		),
		requests: [...requests],
	});
}
globalThis.fetch = realFetch;

const vectors: Json = {
	node: process.version,
	noSolutionValue: NO_SOLUTION_VALUE,
	merkle: {
		builds: merkleBuilds,
		emptyBuild,
		rebuilds: merkleRebuilds,
		fresh: merkleFresh,
		hydrations: merkleHydrations,
		verify: merkleVerify,
	},
	captchaHashes,
	solutionValues,
	matches,
	parsedDatasets,
	parsedSolutions,
	comparisons,
	sortAndHash,
	solutionHashes,
	pendingHashes,
	assetResolutions,
	tokenBases,
	tokenEncodings,
	signedUrls,
	envOptions,
	builtDatasets,
	itemHashes,
	itemHashNow: NOW_MS,
	validations,
};

writeFileSync(
	fileURLToPath(new URL("./vectors.json", import.meta.url)),
	`${JSON.stringify(vectors)}\n`,
);
