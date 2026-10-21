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

// Records the datasets schemas (datasets/captcha.ts and datasets/dataset.ts) into
// datasets-vectors.json, which datasets_equivalence.rs replays against the Rust.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { ZodTypeAny } from "zod";
import * as captcha from "../../src/datasets/captcha.js";
import * as dataset from "../../src/datasets/dataset.js";

// The vectors are what Node 24, the production runtime, produces.
if (!process.version.startsWith("v24.")) {
	throw new Error(`this generator must run on Node 24 (the production runtime), not ${process.version}`);
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

type Result = { ok: Json } | { okUndefined: true } | { issues: Json };

const result = (schema: ZodTypeAny, input: Json | undefined): Result => {
	const parsed = schema.safeParse(input);
	if (!parsed.success) {
		return { issues: JSON.parse(JSON.stringify(parsed.error.issues)) as Json };
	}
	if (parsed.data === undefined) return { okUndefined: true };
	return { ok: JSON.parse(JSON.stringify(parsed.data)) as Json };
};

const WRONG_TYPES: Json[] = [null, 1, 0.5, "", "zzz", [], {}, true];

const variants = (base: { [key: string]: Json }): Json[] => {
	const out: Json[] = [base, { ...base, extra: "stripped" }];
	for (const key of Object.keys(base)) {
		const { [key]: _removed, ...rest } = base;
		out.push(rest);
		for (const replacement of WRONG_TYPES) {
			out.push({ ...base, [key]: replacement });
		}
	}
	return out;
};

const salt = "0x0123456789abcdef0123456789abcdef01";
const item: { [key: string]: Json } = { hash: "0x1", data: "data:image/png;base64,", type: "image" };
const rawCaptcha: { [key: string]: Json } = {
	captchaId: "id",
	captchaContentId: "cid",
	salt,
	solution: [0, 2],
	unlabelled: [1],
	timeLimit: 30000,
	items: [item, { ...item, hash: "0x2", type: "text" }],
	target: "bus",
};
const hashedCaptcha: { [key: string]: Json } = { ...rawCaptcha, solution: ["0xa"], unlabelled: ["0xb"] };
const solution: { [key: string]: Json } = {
	captchaId: "id",
	captchaContentId: "cid",
	solution: ["0xa", "0xb"],
	salt: "s",
	inputMethods: ["keyboard", "pointer"],
};
const tree: Json = [["0xa", "0xb"], ["0xc"]];

const SCHEMAS: [string, ZodTypeAny, Json[]][] = [
	["timestamp", captcha.TimestampSchema, [1700000000000, 1.5, "1"]],
	[
		"captcha",
		captcha.CaptchaSchema,
		[
			...variants({ captchaId: "id", captchaContentId: "cid", salt, solution: [0, 2], unlabelled: [], timeLimit: 30000 }),
			{ salt },
			{ salt: "a".repeat(34) },
			{ salt: "a".repeat(33) },
			{ captchaId: null, salt },
			{ salt, solution: ["a"] },
			{ salt: "😀".repeat(17) },
		],
	],
	["captchaItem", captcha.CaptchaItemSchema, [...variants(item), { ...item, type: "video" }]],
	["hashedCaptchaItem", captcha.HashedCaptchaItemSchema, variants(item)],
	["labelledItem", captcha.LabelledItemSchema, [...variants({ ...item, label: "bus" }), item]],
	["maybeLabelledHashedItem", captcha.MaybeLabelledHashedItemSchema, [...variants({ ...item, label: "bus" }), item]],
	["selectAllCaptchaRaw", captcha.SelectAllCaptchaSchemaRaw, [...variants(rawCaptcha), { ...rawCaptcha, items: [] }]],
	["selectAllCaptcha", captcha.SelectAllCaptchaSchema, [...variants(hashedCaptcha), rawCaptcha]],
	["selectAllCaptchaWithNumericSolution", captcha.SelectAllCaptchaSchemaWithNumericSolution, [...variants(rawCaptcha), hashedCaptcha]],
	["captchas", captcha.CaptchasSchema, [[rawCaptcha, rawCaptcha], [], [{}], [hashedCaptcha]]],
	["captchasWithNumericSolution", captcha.CaptchasWithNumericSolutionSchema, [[rawCaptcha], [hashedCaptcha]]],
	["captchaSolution", captcha.CaptchaSolutionSchema, [...variants(solution), { ...solution, solution: [] }, { ...solution, salt: "" }, { ...solution, inputMethods: ["voice"] }]],
	["captchaSolutionArray", captcha.CaptchaSolutionArraySchema, [[], [solution], solution]],
	["data", captcha.DataSchema, [{ items: [item] }, { items: [] }, { items: [{ ...item, label: "x" }, { ...item, label: 1 }] }]],
	["labelledData", captcha.LabelledDataSchema, [{ items: [item] }, { items: [{ ...item, label: "bus" }] }]],
	["captchasContainer", captcha.CaptchasContainerSchema, [...variants({ captchas: [rawCaptcha], format: "SelectAll" }), { captchas: [], format: "Other" }]],
	["labelsContainer", captcha.LabelsContainerSchema, [{ labels: ["a", "b"] }, { labels: [1] }]],
	[
		"dataset",
		dataset.DatasetSchema,
		[...variants({ datasetId: "0xd", datasetContentId: "0xc", captchas: [rawCaptcha], format: "SelectAll", solutionTree: tree, contentTree: tree, timeLimit: 60000 }), { captchas: [], format: "SelectAll" }],
	],
	["datasetWithNumericSolution", dataset.DatasetWithNumericSolutionSchema, [{ captchas: [rawCaptcha], format: "SelectAll" }, { captchas: [hashedCaptcha], format: "SelectAll" }]],
	[
		"datasetWithIds",
		dataset.DatasetWithIdsSchema,
		[...variants({ datasetId: "0xd", datasetContentId: "0xc", captchas: [hashedCaptcha], format: "SelectAll", solutionTree: tree, contentTree: tree }), { datasetId: "0xd", captchas: [], format: "SelectAll" }],
	],
	[
		"datasetWithIdsAndTree",
		dataset.DatasetWithIdsAndTreeSchema,
		[{ datasetId: "0xd", captchas: [hashedCaptcha], format: "SelectAll", solutionTree: tree, contentTree: tree }, { datasetId: "0xd", captchas: [], format: "SelectAll" }, { datasetId: "0xd", captchas: [], format: "SelectAll", solutionTree: [[1]], contentTree: tree }],
	],
];

const GENERIC: Json[] = [null, true, 0, "", [], {}];

const schemaVectors: { schema: string; input?: Json; result: Result }[] = [];
for (const [name, schema, specific] of SCHEMAS) {
	schemaVectors.push({ schema: name, result: result(schema, undefined) });
	for (const input of [...GENERIC, ...specific]) {
		schemaVectors.push({ schema: name, input, result: result(schema, input) });
	}
}

const output = fileURLToPath(new URL("./datasets-vectors.json", import.meta.url));
writeFileSync(output, `${JSON.stringify({ schemas: SCHEMAS.map(([name]) => name), schemaVectors }, null, "\t")}\n`);
process.stdout.write(`wrote ${schemaVectors.length} datasets schema vectors\n`);
