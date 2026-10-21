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

// Runs a battery of zod 3.23 schemas over a shared corpus of JSON inputs and records each
// safeParse result. schema_equivalence.rs builds the same schemas with the Rust schema module,
// under the same names, and compares.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { type ZodTypeAny, z } from "zod";

// The vectors are what Node 24, the production runtime, produces.
if (!process.version.startsWith("v24.")) {
	throw new Error(`this generator must run on Node 24 (the production runtime), not ${process.version}`);
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

type Input = { value?: Json };

type Result = { ok: Json } | { okUndefined: true } | { issues: Json };

type Vector = { schema: string; input: Input; result: Result };

enum Letters {
	A = "a",
	B = "b",
}

enum Numbers {
	One = 1,
	Two = 2,
}

const SCHEMAS: Record<string, ZodTypeAny> = {
	str: z.string(),
	strBounds: z.string().min(2).max(5),
	strLength: z.string().length(3),
	email: z.string().email(),
	url: z.string().url(),
	regex: z.string().regex(/^[^\u0000-\u001f\u007f]*$/, "must not contain control characters"),
	startsWith: z.string().startsWith("0x"),
	endsWith: z.string().endsWith(".js"),
	includes: z.string().includes("ab"),
	trimLower: z.string().trim().toLowerCase().min(1),
	maxMessage: z.string().max(3, "too long"),
	num: z.number(),
	intPositive: z.number().int().positive(),
	numRange: z.number().min(1).max(10),
	nonnegative: z.number().nonnegative(),
	gtLt: z.number().gt(0).lt(1),
	finite: z.number().finite(),
	coerceNumber: z.coerce.number(),
	coerceDefault: z.coerce.number().optional().default(42),
	coerceString: z.coerce.string(),
	bool: z.boolean(),
	literalString: z.literal("dns"),
	literalNumber: z.literal(3),
	stringEnum: z.enum(["a", "b"]),
	nativeEnum: z.nativeEnum(Letters),
	nativeNumberEnum: z.nativeEnum(Numbers),
	object: z.object({
		a: z.string(),
		b: z.number().optional(),
		c: z.boolean().default(true),
	}),
	objectStrict: z.object({ a: z.string() }).strict(),
	objectPassthrough: z.object({ a: z.string() }).passthrough(),
	objectCatchall: z.object({ a: z.string() }).catchall(z.number()),
	objectNested: z.object({
		inner: z.object({ x: z.number() }),
		list: z.array(z.string()).max(2),
	}),
	objectExtendMergePartial: z
		.object({ a: z.string(), b: z.number() })
		.extend({ b: z.string(), d: z.boolean() })
		.merge(z.object({ e: z.number().default(1) }))
		.partial(),
	array: z.array(z.number()).min(1).max(3),
	arrayLength: z.array(z.number()).length(2),
	tuple: z.tuple([z.string(), z.number()]),
	record: z.record(z.number()),
	recordKeys: z.record(z.string().min(2), z.boolean()),
	union: z.union([z.string().max(3), z.array(z.number()).max(2)]),
	unionDirty: z.union([z.string().min(5), z.number()]),
	unionTwoDirty: z.union([z.string().min(5), z.string().max(2)]),
	transformDirty: z.string().min(3).transform((s: string): number => s.length),
	intersection: z.object({ a: z.string() }).and(z.object({ b: z.number() })),
	optional: z.string().optional(),
	nullable: z.string().nullable(),
	nullish: z.string().nullish(),
	default: z.string().default("x"),
	refine: z.string().refine((s: string): boolean => s.length % 2 === 0, {
		message: "even",
	}),
	refineNoMessage: z.number().refine((n: number): boolean => n > 0),
	superRefine: z
		.object({ a: z.number(), b: z.number() })
		.superRefine((value: { a: number; b: number }, ctx: z.RefinementCtx): void => {
			if (value.a > value.b) {
				ctx.addIssue({ code: z.ZodIssueCode.custom, message: "a>b", path: ["a"] });
			}
		}),
	transform: z.string().transform((s: string): number => s.length),
	preprocess: z.preprocess(
		(value: unknown): unknown => (typeof value === "number" ? { n: value } : value),
		z.object({ n: z.number() }),
	),
	boundedArray: z
		.custom<string[]>(
			(value: unknown): boolean => !Array.isArray(value) || value.length <= 2,
			{ message: "Array must contain at most 2 element(s)" },
		)
		.pipe(z.array(z.string()).max(2)),
	any: z.any(),
	arrayOfOptional: z.array(z.string().optional()),
};

const VALUES: Json[] = [
	null,
	true,
	false,
	0,
	-0,
	1,
	1.5,
	-2,
	3,
	42,
	0.5,
	1e21,
	"",
	"a",
	"ab",
	"abc",
	"abcdef",
	"  Hi  ",
	"   ",
	"0xab",
	"x.js",
	"12",
	" 7 ",
	"0x1f",
	"1e3",
	"Infinity",
	"-",
	"a@b.co",
	"bad@",
	"user.name+tag@ex-ample.co.uk",
	"a..b@x.io",
	".a@x.io",
	"ſ@x.io",
	"a@b.c",
	"http://x",
	"notaurl",
	"https://例え.jp/パス",
	"mailto:a@b.co",
	"dns",
	"http",
	"\u0000",
	"a\nb",
	"😀😀😀",
	"é",
	[],
	[1],
	[1, 2],
	[1, 2, 3, 4],
	["a"],
	["a", "b", "c"],
	[null],
	["x", 1],
	["x", 1, 2],
	[[]],
	[5],
	{},
	{ a: "x" },
	{ a: "x", b: 2, c: false },
	{ a: 1 },
	{ a: "x", extra: 1 },
	{ a: "x", z: 2, y: "no" },
	{ "10": 1, "2": 2, b: 3 },
	{ inner: { x: 1 }, list: ["a"] },
	{ inner: { x: "no" }, list: ["a", "b", "c"] },
	{ n: 1 },
	{ a: 5, b: 1 },
	{ a: 1, b: 5 },
	{ a: "x", b: 2 },
	{ a: "x", b: "y" },
	{ ab: true, c: false },
	{ ab: "no" },
	{ b: "s", d: true, e: 3 },
	{ __proto__: 1 } as Json,
	{ a: "x", b: "two", d: "no", e: "no" },
];

const INPUTS: Input[] = [{}, ...VALUES.map((value: Json): Input => ({ value }))];

const result = (schema: ZodTypeAny, input: Input): Result => {
	const parsed = "value" in input ? schema.safeParse(input.value) : schema.safeParse(undefined);
	if (!parsed.success) {
		return { issues: JSON.parse(JSON.stringify(parsed.error.issues)) as Json };
	}
	if (parsed.data === undefined) return { okUndefined: true };
	return { ok: JSON.parse(JSON.stringify(parsed.data)) as Json };
};

const vectors: Vector[] = [];
for (const [name, schema] of Object.entries(SCHEMAS)) {
	for (const input of INPUTS) {
		vectors.push({ schema: name, input, result: result(schema, input) });
	}
}

const output = fileURLToPath(new URL("./schema-vectors.json", import.meta.url));
writeFileSync(output, `${JSON.stringify({ schemas: Object.keys(SCHEMAS), vectors }, null, "\t")}\n`);
process.stdout.write(`wrote ${vectors.length} schema vectors\n`);
