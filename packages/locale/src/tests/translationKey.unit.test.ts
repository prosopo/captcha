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

import { describe, expect, test } from "vitest";
import translationEn from "../locales/en/translation.json" with {
	type: "json",
};
import {
	TranslationKeysSchema,
	type TranslationNode,
	getLeafFieldPath,
} from "../translationKey.js";

describe("getLeafFieldPath", () => {
	test("returns no paths for a bare string, which is a leaf and not a container", () => {
		expect(getLeafFieldPath("a string")).toEqual([]);
	});

	test("returns no paths for the empty string", () => {
		expect(getLeafFieldPath("")).toEqual([]);
	});

	// The string is the leaf, so the path ends at its key. This used to yield
	// [] — the recursion returned nothing for a string and the parent mapped
	// over that empty list — which made the whole function return [] for every
	// input and left TranslationKeysSchema an empty enum.
	test("emits a top-level string value under its own key", () => {
		expect(getLeafFieldPath({ topLevel: "value" })).toEqual(["topLevel"]);
	});

	test("emits section.key for a one-level-deep section", () => {
		expect(getLeafFieldPath({ section: { key: "value" } })).toEqual([
			"section.key",
		]);
	});

	test("emits every key of a section, in insertion order", () => {
		expect(
			getLeafFieldPath({ section: { first: "1", second: "2", third: "3" } }),
		).toEqual(["section.first", "section.second", "section.third"]);
	});

	test("recurses to arbitrary depth, joining each level with a dot", () => {
		expect(getLeafFieldPath({ a: { b: { c: { d: "leaf" } } } })).toEqual([
			"a.b.c.d",
		]);
	});

	test("handles sibling branches of differing depth", () => {
		expect(
			getLeafFieldPath({
				shallow: { key: "v" },
				deep: { nested: { key: "v" } },
			}),
		).toEqual(["shallow.key", "deep.nested.key"]);
	});

	test("returns no paths for an empty object", () => {
		expect(getLeafFieldPath({})).toEqual([]);
	});

	// Same silent-drop hazard as the top-level string: an empty section
	// contributes nothing rather than erroring, so a translation file that
	// loses all of a section's contents still parses.
	test("drops an empty nested section rather than erroring", () => {
		expect(getLeafFieldPath({ section: {} })).toEqual([]);
	});

	test("keeps populated siblings when one section is empty", () => {
		expect(getLeafFieldPath({ empty: {}, full: { key: "v" } })).toEqual([
			"full.key",
		]);
	});

	// Object.keys never yields a key whose value is undefined by omission, so
	// this guard is only reachable via an explicitly-assigned undefined. It
	// still has to hold: a JSON file cannot express it, but a caller passing a
	// hand-built object can, and a silently-skipped key would corrupt the
	// schema.
	test("throws on an explicitly undefined value, naming the offending key", () => {
		const node = {
			section: { broken: undefined },
		} as unknown as TranslationNode;
		expect(() => getLeafFieldPath(node)).toThrow(
			"Undefined value for key broken",
		);
	});

	test("throws before emitting any of the sibling keys of the broken one", () => {
		const node = {
			section: { ok: "v", broken: undefined },
		} as unknown as TranslationNode;
		expect(() => getLeafFieldPath(node)).toThrow(/Undefined value/);
	});

	test("does not mutate the input", () => {
		const node: TranslationNode = { section: { key: "value" } };
		const snapshot = JSON.stringify(node);
		getLeafFieldPath(node);
		expect(JSON.stringify(node)).toBe(snapshot);
	});
});

describe("TranslationKeysSchema", () => {
	const keys = getLeafFieldPath(translationEn as TranslationNode);

	test("is non-empty — an empty z.enum would throw at module load", () => {
		expect(keys.length).toBeGreaterThan(0);
	});

	test("accepts every key derived from the English translation", () => {
		for (const key of keys) {
			expect(TranslationKeysSchema.parse(key)).toBe(key);
		}
	});

	test("rejects a key that is not in the English translation", () => {
		expect(() => TranslationKeysSchema.parse("no.such.key")).toThrow();
	});

	test("rejects the empty string", () => {
		expect(() => TranslationKeysSchema.parse("")).toThrow();
	});

	test("rejects a section name on its own — only leaves are valid keys", () => {
		const [firstKey] = keys;
		expect(firstKey).toBeDefined();
		const section = String(firstKey).split(".")[0];
		expect(() => TranslationKeysSchema.parse(section)).toThrow();
	});

	test("rejects non-string input", () => {
		expect(() => TranslationKeysSchema.parse(42)).toThrow();
		expect(() => TranslationKeysSchema.parse(null)).toThrow();
		expect(() => TranslationKeysSchema.parse(undefined)).toThrow();
	});

	test("safeParse reports failure without throwing", () => {
		const result = TranslationKeysSchema.safeParse("no.such.key");
		expect(result.success).toBe(false);
	});

	test("is case sensitive", () => {
		const [firstKey] = keys;
		expect(firstKey).toBeDefined();
		const upper = String(firstKey).toUpperCase();
		if (upper !== firstKey) {
			expect(() => TranslationKeysSchema.parse(upper)).toThrow();
		}
	});

	test("exposes exactly the derived keys as enum options", () => {
		expect(new Set(TranslationKeysSchema.options)).toEqual(new Set(keys));
	});
});
