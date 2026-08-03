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
import {
	brand,
	brandClass,
	brandKey,
	getBrand,
	unbrand,
	unbrandClass,
} from "../index.js";

/**
 * Branding is a compile-time device: every function here is an identity cast at
 * runtime. The type-level guarantees live in brand.test-d.ts; this file pins
 * down the runtime half — that nothing is copied, wrapped or mutated, and that
 * getBrand, the one function with real behaviour, reads what it should.
 */

class Point {
	constructor(
		public x: number,
		public y: number,
	) {}
	distance(): number {
		return Math.hypot(this.x, this.y);
	}
}

describe("brand", () => {
	test("hands back the very same value, not a copy", () => {
		const value = { a: 1 };
		expect(brand(value, "A")).toBe(value);
	});

	test("leaves the value's own keys untouched", () => {
		const value = { a: 1 };
		brand(value, "A");
		expect(Object.keys(value)).toEqual(["a"]);
		expect(Object.getOwnPropertySymbols(value)).toEqual([]);
	});

	test("brands primitives without boxing them", () => {
		expect(brand(1, "N")).toBe(1);
		expect(brand("s", "S")).toBe("s");
		expect(brand(false, "B")).toBe(false);
	});

	test("brands the empty string and zero, which are falsy but valid", () => {
		expect(brand("", "S")).toBe("");
		expect(brand(0, "N")).toBe(0);
	});

	test("brands null and undefined without touching them", () => {
		expect(brand(null, "N")).toBeNull();
		expect(brand(undefined, "U")).toBeUndefined();
	});

	test("re-branding does not stack or replace anything at runtime", () => {
		const value = { a: 1 };
		expect(brand(brand(value, "A"), "B")).toBe(value);
	});
});

describe("unbrand", () => {
	test("hands back the very same value", () => {
		const value = { a: 1 };
		expect(unbrand(brand(value, "A"))).toBe(value);
	});

	test("does not remove a real brandKey property, since it never added one", () => {
		// Nothing writes brandKey, so an object carrying one keeps it: unbrand
		// is a cast, not a delete.
		const value: Record<symbol, string> = { [brandKey]: "A" };
		expect(unbrand(value)[brandKey]).toBe("A");
	});

	test("is safe on a value that was never branded", () => {
		const value = { a: 1 };
		expect(unbrand(value)).toBe(value);
	});
});

describe("brandClass and unbrandClass", () => {
	test("the branded constructor is the original constructor", () => {
		expect(brandClass(Point, "Point")).toBe(Point);
	});

	test("instances still work, prototype and all", () => {
		const Branded = brandClass(Point, "Point");
		const point = new Branded(3, 4);
		expect(point).toBeInstanceOf(Point);
		expect(point.distance()).toBe(5);
	});

	test("branding the same class twice yields the same constructor", () => {
		// Two brands of one class are distinct types but a single runtime value,
		// so an instanceof check cannot tell them apart. Callers relying on that
		// distinction need it enforced at compile time.
		expect(brandClass(Point, "A")).toBe(brandClass(Point, "B"));
		expect(new (brandClass(Point, "A"))(1, 2)).toBeInstanceOf(
			brandClass(Point, "B"),
		);
	});

	test("unbrandClass hands the constructor straight back", () => {
		expect(unbrandClass(brandClass(Point, "Point"))).toBe(Point);
	});
});

describe("getBrand", () => {
	test("reads a brand that was actually written onto the value", () => {
		const value: Record<symbol, string> = { [brandKey]: "A" };
		expect(getBrand(value)).toBe("A");
	});

	test("reports nothing for a value branded only at the type level", () => {
		// brand() writes no property, so the runtime answer is "" even though
		// the type says "A". getBrand is only useful alongside a value that
		// carries the symbol itself.
		expect(getBrand(brand({ a: 1 }, "A"))).toBe("");
	});

	test("reports nothing for a plain object, a primitive or an empty string", () => {
		expect(getBrand({ a: 1 })).toBe("");
		expect(getBrand(1)).toBe("");
		expect(getBrand("")).toBe("");
	});

	test("collapses a falsy stored brand to the empty string", () => {
		// The `|| ""` fallback cannot distinguish "absent" from "stored as
		// empty", so a deliberately blank brand reads as no brand at all.
		const value: Record<symbol, string> = { [brandKey]: "" };
		expect(getBrand(value)).toBe("");
	});

	test("throws on null and undefined rather than reporting no brand", () => {
		// Worth pinning down: callers cannot use getBrand as a total function
		// over unknown input without a null check of their own.
		expect(() => getBrand(null)).toThrow(TypeError);
		expect(() => getBrand(undefined)).toThrow(TypeError);
	});

	test("finds a brand inherited from a prototype", () => {
		const parent: Record<symbol, string> = { [brandKey]: "A" };
		expect(getBrand(Object.create(parent))).toBe("A");
	});

	test("reads through a getter, exceptions included", () => {
		const value = {};
		Object.defineProperty(value, brandKey, {
			get: () => {
				throw new Error("brand getter blew up");
			},
		});
		expect(() => getBrand(value)).toThrow("brand getter blew up");
	});
});

describe("brandKey", () => {
	test("is a symbol, so it cannot collide with a string key", () => {
		expect(typeof brandKey).toBe("symbol");
		expect(brandKey.description).toBe("brand");
	});

	test("is not registered globally, so another realm cannot forge it", () => {
		expect(Symbol.keyFor(brandKey)).toBeUndefined();
		expect(brandKey).not.toBe(Symbol.for("brand"));
	});
});
