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

import { flatten } from "@prosopo/util";
import { describe, expect, test } from "vitest";
import targetEn from "../locales/en/target.json" with { type: "json" };
import serverEn from "../locales/en/translation.json" with { type: "json" };
import widgetEn from "../locales/en/widget.json" with { type: "json" };
import {
	englishText,
	isTargetKey,
	isTranslationKey,
	targetKeys,
	translationKeys,
} from "../serverTranslationKeys.js";
import {
	NAMESPACES,
	type TranslationNode,
	canTranslate,
	getLeafFieldPath,
	isWidgetTranslationKey,
} from "../translationKey.js";
import type { Ti18n } from "../types.js";

const widgetSections: readonly string[] = [
	"WIDGET",
	"API",
	"CAPTCHA",
	"GENERAL",
	"ACCOUNT",
	"DEVELOPER",
];

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
	// input and left `translationKeys` empty.
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

describe("translationKeys", () => {
	const keys: string[] = [widgetEn, targetEn, serverEn].flatMap(
		(catalogue: TranslationNode) => getLeafFieldPath(catalogue),
	);

	test("is non-empty — mongoose validates against an empty enum too", () => {
		expect(keys.length).toBeGreaterThan(0);
	});

	test("is exactly the set of keys derived from the English translation", () => {
		expect(new Set(translationKeys)).toEqual(new Set(keys));
	});

	test("has each key in one namespace only", () => {
		expect(translationKeys).toHaveLength(keys.length);
		expect(new Set(keys).size).toBe(keys.length);
	});

	test("holds leaves, not section names", () => {
		const [firstKey] = keys;
		expect(firstKey).toBeDefined();
		const section = String(firstKey).split(".")[0];
		expect(translationKeys).not.toContain(section);
	});

	test("does not contain a key absent from the English translation", () => {
		expect(translationKeys).not.toContain("no.such.key");
	});

	test("does not contain the empty string", () => {
		expect(translationKeys).not.toContain("");
	});
});

describe("isTranslationKey", () => {
	test("accepts a leaf of the English catalogue", () => {
		expect(isTranslationKey("WIDGET.I_AM_HUMAN")).toBe(true);
		expect(isTranslationKey("API.INVALID_SITE_KEY")).toBe(true);
	});

	test("rejects a section, a mistyped key, free text and the empty string", () => {
		expect(isTranslationKey("WIDGET")).toBe(false);
		expect(isTranslationKey("WIDGET.I_AM_HUMANN")).toBe(false);
		expect(isTranslationKey("Invalid site key")).toBe(false);
		expect(isTranslationKey("")).toBe(false);
	});
});

describe("targetKeys", () => {
	test("is every TARGET label of the English catalogue", () => {
		expect(targetKeys).toEqual(Object.keys(targetEn.TARGET));
	});

	test("is the TARGET leaves of translationKeys, without the prefix", () => {
		const fromKeys: string[] = translationKeys
			.filter((key: string) => key.startsWith("TARGET."))
			.map((key: string) => key.slice("TARGET.".length));
		expect(new Set(targetKeys)).toEqual(new Set(fromKeys));
	});
});

describe("isTargetKey", () => {
	test("accepts a label, including a hyphenated one", () => {
		expect(isTargetKey("owl")).toBe(true);
		expect(isTargetKey("fire-hydrant")).toBe(true);
	});

	test("rejects the prefixed key, a section, an unknown label and the empty string", () => {
		expect(isTargetKey("TARGET.owl")).toBe(false);
		expect(isTargetKey("TARGET")).toBe(false);
		expect(isTargetKey("not-a-label")).toBe(false);
		expect(isTargetKey("")).toBe(false);
	});

	test("is case-sensitive, as the dataset labels are", () => {
		expect(isTargetKey("Owl")).toBe(false);
	});
});

describe("NAMESPACES", () => {
	test("keeps i18next's default namespace for the server-only text", () => {
		expect(NAMESPACES).toEqual({
			widget: "widget",
			target: "target",
			server: "translation",
		});
	});

	test("puts the widget's sections in widget, labels in target, the rest in translation", () => {
		expect(Object.keys(widgetEn).sort()).toEqual([...widgetSections].sort());
		expect(Object.keys(targetEn)).toEqual(["TARGET"]);
		for (const section of Object.keys(serverEn)) {
			expect(widgetSections).not.toContain(section);
			expect(section).not.toBe("TARGET");
		}
	});
});

describe("isWidgetTranslationKey", () => {
	test("accepts every key in the widget namespace", () => {
		for (const key of getLeafFieldPath(widgetEn)) {
			expect(isWidgetTranslationKey(key)).toBe(true);
		}
	});

	test("rejects keys only the server has text for", () => {
		expect(isWidgetTranslationKey("TARGET.owl")).toBe(false);
		expect(isWidgetTranslationKey("DATABASE.UNKNOWN")).toBe(false);
		expect(isTranslationKey("DATABASE.UNKNOWN")).toBe(true);
	});

	test("rejects a section, free text and the empty string", () => {
		expect(isWidgetTranslationKey("WIDGET")).toBe(false);
		expect(isWidgetTranslationKey("Invalid site key")).toBe(false);
		expect(isWidgetTranslationKey("")).toBe(false);
	});
});

describe("englishText", () => {
	test("reads each namespace's English text", () => {
		expect(englishText("TARGET.owl")).toBe(targetEn.TARGET.owl);
		expect(englishText("WIDGET.SELECT_ALL")).toBe(widgetEn.WIDGET.SELECT_ALL);
		expect(englishText("DATABASE.UNKNOWN")).toBe(serverEn.DATABASE.UNKNOWN);
	});

	test("matches the flattened English catalogues for every key", () => {
		const english: Record<string, string> = flatten({
			...serverEn,
			...widgetEn,
			...targetEn,
		});
		for (const key of translationKeys) {
			if (isTranslationKey(key)) {
				expect(englishText(key)).toBe(english[key]);
			}
		}
	});
});

describe("canTranslate", () => {
	const knowing = (...keys: string[]): Pick<Ti18n, "exists"> => ({
		exists: (key: string): boolean => keys.includes(key),
	});

	test("accepts a key the instance has text for", () => {
		expect(
			canTranslate(knowing("WIDGET.SELECT_ALL"), "WIDGET.SELECT_ALL"),
		).toBe(true);
	});

	test("rejects a key the instance lacks, even one English has", () => {
		expect(canTranslate(knowing(), "TARGET.owl")).toBe(false);
		expect(canTranslate(knowing("WIDGET.SELECT_ALL"), "Free text.")).toBe(
			false,
		);
	});
});
