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

import { describe, expect, test, vi } from "vitest";
import {
	type WrapperTag,
	randomInt,
	randomToken,
	randomTokens,
	randomWrapperTag,
} from "../obfuscation.js";

describe("randomToken", () => {
	test("is usable as both a css class and an html id", () => {
		// A leading digit is legal in neither, and the token is used as both.
		for (let attempt = 0; attempt < 200; attempt += 1) {
			expect(randomToken()).toMatch(/^[a-zA-Z][a-zA-Z0-9]{7}$/);
		}
	});

	test("honours the requested length", () => {
		expect(randomToken(1)).toHaveLength(1);
		expect(randomToken(24)).toHaveLength(24);
	});

	test("practically never repeats itself", () => {
		// 8 characters over 52*62^7 keeps collisions out of the picture; a stuck
		// source of randomness is what this is really watching for.
		const tokens = new Set(Array.from({ length: 500 }, () => randomToken()));
		expect(tokens.size).toBe(500);
	});

	test("uses more than a handful of the alphabet", () => {
		const letters = new Set(randomToken(400).split(""));
		expect(letters.size).toBeGreaterThan(20);
	});
});

describe("randomTokens", () => {
	test("returns the requested count, all distinct", () => {
		const tokens: string[] = randomTokens(6);
		expect(tokens).toHaveLength(6);
		expect(new Set(tokens).size).toBe(6);
	});

	test("returns nothing for a count of zero", () => {
		expect(randomTokens(0)).toEqual([]);
	});
});

describe("mapping the random source onto a range", () => {
	test("no value in the range dominates", () => {
		// Folding a draw onto a range carelessly skews it towards one end; this
		// is what that regression would look like from the outside.
		const counts = new Map<number, number>();
		for (let attempt = 0; attempt < 20_000; attempt += 1) {
			const value: number = randomInt(0, 99);
			counts.set(value, (counts.get(value) ?? 0) + 1);
		}
		expect(counts.size).toBe(100);
		for (const count of counts.values()) {
			expect(count).toBeGreaterThan(120);
			expect(count).toBeLessThan(280);
		}
	});

	test("takes its draws from Math.random, not from crypto", () => {
		// Deliberate: the names are read off the rendered DOM anyway, so they do
		// not need to be unguessable, and squeezing a cryptographic draw into a
		// range this small is what introduces bias.
		const spy = vi.spyOn(Math, "random");
		try {
			randomToken();
			expect(spy).toHaveBeenCalled();
		} finally {
			spy.mockRestore();
		}
	});
});

describe("randomInt", () => {
	test("stays within the inclusive bounds", () => {
		for (let attempt = 0; attempt < 500; attempt += 1) {
			const value: number = randomInt(-8, 8);
			expect(value).toBeGreaterThanOrEqual(-8);
			expect(value).toBeLessThanOrEqual(8);
			expect(Number.isInteger(value)).toBe(true);
		}
	});

	test("reaches both ends of the range", () => {
		const seen = new Set(Array.from({ length: 400 }, () => randomInt(0, 3)));
		expect(Array.from(seen).sort()).toEqual([0, 1, 2, 3]);
	});

	test("a single-value range is that value", () => {
		expect(randomInt(5, 5)).toBe(5);
	});
});

describe("randomWrapperTag", () => {
	test("only ever picks an element with no accessible role", () => {
		// A landmark element here would be announced to a screen reader as part
		// of the page structure, which the wrappers are not.
		const tags = new Set(Array.from({ length: 200 }, () => randomWrapperTag()));
		const allowed: WrapperTag[] = ["div", "span"];
		for (const tag of tags) {
			expect(allowed).toContain(tag);
		}
		expect(tags.size).toBe(2);
	});
});

describe("on a runtime with no crypto implementation", () => {
	test("still renders, because it never asked for one", () => {
		// Older embedded webviews have no crypto. Losing a consumer's whole
		// widget over a naming detail would be a far worse trade than names an
		// attacker could have read off the page regardless.
		const saved: Crypto = globalThis.crypto;
		Reflect.defineProperty(globalThis, "crypto", {
			configurable: true,
			value: undefined,
			writable: true,
		});
		try {
			expect(randomToken()).toMatch(/^[a-zA-Z][a-zA-Z0-9]{7}$/);
			expect(randomToken()).not.toBe(randomToken());
			expect(randomInt(2, 5)).toBeGreaterThanOrEqual(2);
		} finally {
			Reflect.defineProperty(globalThis, "crypto", {
				configurable: true,
				value: saved,
				writable: true,
			});
		}
	});
});
