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

import { describe, expect, it } from "vitest";
import { z } from "zod";
import * as types from "../index.js";
import { INPUT_LIMITS, hasAtMostKeys } from "./inputLimits.js";
import {
	findZodBounds,
	stringLimitViolations,
	zodExports,
} from "./zodBounds.js";

describe("findZodBounds", () => {
	it("reports unbounded strings, numbers, arrays, sets and records", () => {
		const schema = z.object({
			s: z.string(),
			n: z.number().int(),
			a: z.array(z.boolean()),
			set: z.set(z.boolean()),
			r: z.record(z.boolean()),
		});
		expect(findZodBounds(schema).unbounded).toEqual([
			"s:string",
			"n:number",
			"a:array",
			"set:set",
			"r:record",
		]);
	});

	it("accepts bounded and fixed-format leaves", () => {
		const schema = z.object({
			s: z.string().max(3),
			fixed: z.string().length(2),
			id: z.string().uuid(),
			n: z.number().safe(),
			between: z.number().min(0).max(1),
			a: z.array(z.boolean()).max(2),
			r: z
				.record(z.string().max(1), z.boolean())
				.refine(hasAtMostKeys(2), { message: "Too many keys" }),
			e: z.enum(["x"]),
		});
		expect(findZodBounds(schema).unbounded).toEqual([]);
	});

	it("walks through wrappers, unions, intersections, tuples and lazies", () => {
		const leaf = z.string();
		const lazy: z.ZodTypeAny = z.lazy(() => z.object({ self: lazy, leaf }));
		const schema = z.object({
			o: leaf.optional().nullable().default(null),
			u: z.union([z.number(), z.literal(1)]),
			d: z.discriminatedUnion("k", [
				z.object({ k: z.literal("a"), v: z.array(z.boolean()) }),
			]),
			i: z.intersection(z.object({ x: z.number() }), z.object({})),
			t: z.tuple([z.boolean()]).rest(z.number()),
			p: z.string().pipe(z.string()),
			b: z.number().brand<"b">(),
			l: lazy,
		});
		expect(findZodBounds(schema).unbounded).toEqual([
			"o:string",
			"u|0:number",
			"d|0.v:array",
			"i.x:number",
			"t[...]:number",
			"p:string",
			"b:number",
		]);
	});

	it("does not treat a transform as a record bound", () => {
		const schema = z.record(z.boolean()).transform((value) => value);
		expect(findZodBounds(schema).unbounded).toEqual([":record"]);
	});

	it("lists every bounded string with its limit", () => {
		const schema = z.object({ s: z.string().max(5).max(3) });
		const { strings } = findZodBounds(schema);
		expect(strings.map(({ path, max }) => [path, max])).toEqual([["s", 3]]);
		expect(stringLimitViolations(strings)).toEqual([]);
	});

	it("reports a string whose limit is not enforced", () => {
		const schema = z.string().max(5);
		expect(stringLimitViolations([{ path: "s", schema, max: 3 }])).toEqual([
			"s accepts 4",
		]);
	});
});

describe("zodExports", () => {
	it("keeps only zod schemas", () => {
		const schema = z.string();
		expect(zodExports({ schema, value: 1, fn: () => schema })).toEqual([
			["schema", schema],
		]);
	});
});

describe("@prosopo/types schemas", () => {
	const schemas = zodExports(types);

	it("finds schemas to check", () => {
		expect(schemas.length).toBeGreaterThan(50);
	});

	it.each(schemas)(
		"%s bounds every string, number, array and record",
		(name, schema) => {
			expect(findZodBounds(schema, name).unbounded).toEqual([]);
		},
	);

	it.each(schemas)(
		"%s rejects strings one over their limit",
		(name, schema) => {
			expect(
				stringLimitViolations(findZodBounds(schema, name).strings),
			).toEqual([]);
		},
	);

	it("keeps record and array limits in INPUT_LIMITS", () => {
		expect(INPUT_LIMITS.ARRAY).toBeGreaterThan(0);
		expect(INPUT_LIMITS.RECORD_KEYS).toBeGreaterThan(0);
	});
});
