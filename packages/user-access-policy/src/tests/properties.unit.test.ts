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

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
	decodeHeaderValueList,
	encodeHeaderValueList,
	evaluateHeaderCondition,
} from "#policy/headerMatch.js";
import { parseRedisRecords } from "#policy/redis/redisClient.js";
import { loggerMockedInstance } from "./testLogger.js";

const literal = fc.string().filter((s) => !s.trimStart().startsWith("["));
const headerName = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9-]{0,15}$/);
const headers = fc.dictionary(
	headerName.map((name) => name.toLowerCase()),
	fc.string(),
);

describe("header value lists", () => {
	it("decode inverts encode for any non-empty list", () => {
		fc.assert(
			fc.property(fc.array(fc.string(), { minLength: 1 }), (values) => {
				expect(decodeHeaderValueList(encodeHeaderValueList(values))).toEqual(
					values,
				);
			}),
		);
	});

	it("decode never throws and yields a non-empty list or undefined", () => {
		fc.assert(
			fc.property(
				fc.oneof(
					fc.string(),
					fc.json(),
					fc.string().map((s) => `[${s}`),
				),
				(value) => {
					const decoded = decodeHeaderValueList(value);
					if (decoded === undefined) return;
					expect(decoded.length).toBeGreaterThan(0);
					for (const entry of decoded) expect(typeof entry).toBe("string");
				},
			),
		);
	});
});

describe("evaluateHeaderCondition", () => {
	it("a negated operator is the opposite of its positive form", () => {
		fc.assert(
			fc.property(headerName, fc.string(), headers, (name, value, request) => {
				expect(evaluateHeaderCondition(name, "notEquals", value, request)).toBe(
					!evaluateHeaderCondition(name, "equals", value, request),
				);
				expect(
					evaluateHeaderCondition(name, "notContains", value, request),
				).toBe(!evaluateHeaderCondition(name, "contains", value, request));
			}),
		);
	});

	it("a one-value list behaves like the single-value operator", () => {
		fc.assert(
			fc.property(headerName, literal, headers, (name, value, request) => {
				for (const encoded of [value, encodeHeaderValueList([value])]) {
					expect(
						evaluateHeaderCondition(name, "notEqualsAny", encoded, request),
					).toBe(evaluateHeaderCondition(name, "notEquals", value, request));
					expect(
						evaluateHeaderCondition(name, "notContainsAny", encoded, request),
					).toBe(evaluateHeaderCondition(name, "notContains", value, request));
				}
			}),
		);
	});

	it("matches header names case-insensitively", () => {
		fc.assert(
			fc.property(headerName, fc.string(), (name, value) => {
				const request = { [name.toLowerCase()]: value };
				expect(
					evaluateHeaderCondition(name.toUpperCase(), "equals", value, request),
				).toBe(true);
			}),
		);
	});
});

describe("parseRedisRecords", () => {
	it("keeps exactly the records the schema accepts, in order", () => {
		fc.assert(
			fc.property(fc.array(fc.anything()), (records) => {
				const schema = z.number();
				expect(
					parseRedisRecords(records, schema, loggerMockedInstance),
				).toEqual(records.filter((r) => schema.safeParse(r).success));
			}),
		);
	});
});
