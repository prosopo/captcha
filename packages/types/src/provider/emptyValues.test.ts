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
import { ZodObject, type ZodRawShape } from "zod";
import * as api from "./api.js";

const hostileValues: readonly unknown[] = [
	undefined,
	null,
	"",
	"   ",
	[],
	{},
	0,
	Number.NaN,
	true,
];

const objectSchemas: [string, ZodObject<ZodRawShape>][] = Object.entries(
	api,
).flatMap(([name, value]): [string, ZodObject<ZodRawShape>][] =>
	value instanceof ZodObject ? [[name, value]] : [],
);

const fieldCases: [string, string, unknown][] = objectSchemas.flatMap(
	([name, schema]) =>
		Object.keys(schema.shape).flatMap((field) =>
			hostileValues.map((value): [string, string, unknown] => [
				name,
				field,
				value,
			]),
		),
);

describe("provider API schemas given empty or wrongly typed fields", () => {
	it("finds the request schemas to check", () => {
		expect(objectSchemas.map(([name]) => name)).toContain(
			"SubmitPowCaptchaSolutionBody",
		);
	});

	it.each(fieldCases)(
		"%s.%s = %j is a validation result, not a throw",
		(_name: string, field: string, value: unknown) => {
			const schema = objectSchemas.find(([name]) => name === _name)?.[1];
			expect(() => schema?.safeParse({ [field]: value })).not.toThrow();
		},
	);

	it.each([undefined, null, [], {}])(
		"rejects a PoW submission whose challenge is %j",
		(value: unknown) => {
			const result = api.SubmitPowCaptchaSolutionBody.safeParse({
				challenge: value,
			});
			expect(result.success).toBe(false);
			expect(result.error?.issues.map((issue) => issue.path[0])).toContain(
				"challenge",
			);
		},
	);
});
