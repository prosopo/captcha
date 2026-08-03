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

import { assertType, describe, expectTypeOf, test } from "vitest";
import {
	type Brand,
	type Ctor,
	type Resolve,
	type Unbrand,
	brand,
	brandClass,
	brandKey,
	getBrand,
	unbrand,
	unbrandClass,
} from "../index.js";

/**
 * The whole point of this package is the type layer, so these are the tests
 * that matter: a brand has to be a real barrier between two structurally
 * identical types, and it has to survive being passed around.
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

type UserId = Brand<string, "UserId">;
type SessionId = Brand<string, "SessionId">;

describe("Brand", () => {
	test("keeps every member of the base type reachable", () => {
		const id: UserId = brand("u1", "UserId");
		expectTypeOf(id.toUpperCase()).toEqualTypeOf<string>();
		expectTypeOf(id.length).toEqualTypeOf<number>();
	});

	test("a branded primitive does NOT satisfy its own base type", () => {
		// A known limitation rather than an intended guarantee. Resolve maps the
		// intersection into an object carrying string's methods, which is not a
		// string, so a branded primitive cannot be handed to a base-typed API
		// directly — callers have to unbrand() first. Branded *objects* do not
		// have this problem, since mapping an object yields an object.
		// @ts-expect-error - remove this directive if Brand is ever made
		// conditional on the base type; the assertion is the fix's regression test.
		assertType<string>(brand("u1", "UserId"));
	});

	test("two brands over the same base are not interchangeable", () => {
		const user: UserId = brand("u1", "UserId");
		const session: SessionId = brand("s1", "SessionId");
		// @ts-expect-error - a session id is not a user id, however alike.
		assertType<UserId>(session);
		// @ts-expect-error - and the reverse, which is the whole point.
		assertType<SessionId>(user);
	});

	test("a raw base value cannot pass as a branded one", () => {
		// @ts-expect-error - unbranded strings must go through brand().
		assertType<UserId>("u1");
	});

	test("a branded object still passes where the base object is wanted", () => {
		assertType<Point>(brand(new Point(1, 2), "P"));
	});

	test("the brand tag is the literal it was given, not a widened string", () => {
		// `const U` on brand() is what keeps "UserId" from collapsing to string;
		// without it every brand would be the same brand.
		expectTypeOf(brand("u1", "UserId")[brandKey]).toEqualTypeOf<"UserId">();
	});

	test("branding an object leaves every property in place", () => {
		const point: Brand<Point, "P"> = brand(new Point(1, 2), "P");
		expectTypeOf(point.x).toEqualTypeOf<number>();
		expectTypeOf(point.distance).toEqualTypeOf<() => number>();
	});

	test("branding a value twice collapses the whole type to never", () => {
		// The second brand intersects with the first rather than replacing it,
		// and two different literal tags share no member, so the brandKey
		// property — and with it the entire type — reduces to never. A value can
		// carry one brand only; nesting silently destroys the type.
		expectTypeOf(
			brand(brand("u1", "UserId"), "Trusted"),
		).toEqualTypeOf<never>();
	});

	test("the tag need not be a string", () => {
		expectTypeOf(brand(1, 42)[brandKey]).toEqualTypeOf<42>();
		expectTypeOf(brand(1, true)[brandKey]).toEqualTypeOf<true>();
	});
});

describe("Unbrand", () => {
	/**
	 * Unbrand is currently a no-op for anything that was actually branded.
	 * `T extends Brand<infer U, any>` asks TypeScript to invert a mapped type,
	 * which it cannot do, so the conditional falls through to `T` every time.
	 * These tests assert what the code does rather than what its name promises,
	 * so that a future fix has to come with a deliberate update here.
	 */

	test("leaves an unbranded type alone, correctly", () => {
		expectTypeOf<Unbrand<number>>().toEqualTypeOf<number>();
		expectTypeOf(unbrand(1)).toEqualTypeOf<number>();
	});

	test("does not strip a brand off a primitive", () => {
		expectTypeOf<Unbrand<UserId>>().toEqualTypeOf<UserId>();
		expectTypeOf<Unbrand<UserId>>().toExtend<{ [brandKey]: "UserId" }>();
	});

	test("does not strip a brand off an object either", () => {
		type BrandedPoint = Brand<Point, "P">;
		expectTypeOf<Unbrand<BrandedPoint>>().toEqualTypeOf<BrandedPoint>();
	});

	test("so an unbranded value still passes where the brand is wanted", () => {
		// The escape hatch does not escape: this assignment should be an error
		// once Unbrand works, and the test will fail loudly when it starts to.
		assertType<UserId>(unbrand(brand("u1", "UserId")));
	});

	test("and the brand still bars the base type, before and after unbranding", () => {
		// @ts-expect-error - a raw string is not a UserId.
		assertType<UserId>("u1");
		// @ts-expect-error - and unbrand() does not make one usable as a string.
		assertType<string>(unbrand(brand("u1", "UserId")));
	});
});

describe("brandClass and unbrandClass", () => {
	test("the branded constructor keeps its parameters", () => {
		const Branded = brandClass(Point, "Point");
		expectTypeOf(Branded).constructorParameters.toExtend<unknown[]>();
		expectTypeOf(new Branded(1, 2)).toExtend<Point>();
	});

	test("instances of a branded class carry the tag", () => {
		expectTypeOf(
			new (brandClass(Point, "Point"))(1, 2)[brandKey],
		).toEqualTypeOf<"Point">();
	});

	test("two brands of one class produce incompatible instance types", () => {
		const A = brandClass(Point, "A");
		const B = brandClass(Point, "B");
		// @ts-expect-error - the compile-time barrier the runtime cannot provide.
		assertType<InstanceType<typeof A>>(new B(1, 2));
	});

	test("unbrandClass inherits Unbrand's no-op, so the tag survives", () => {
		const plain = unbrandClass(brandClass(Point, "Point"));
		expectTypeOf(new plain(1, 2)).toExtend<Point>();
		expectTypeOf(new plain(1, 2)[brandKey]).toEqualTypeOf<"Point">();
	});
});

describe("getBrand", () => {
	test("reports the tag of a branded value", () => {
		expectTypeOf(getBrand(brand("u1", "UserId"))).toEqualTypeOf<"UserId">();
	});

	test("reports the empty string for anything unbranded", () => {
		// The `|| ""` in the implementation is what the type mirrors here, so an
		// unbranded value is distinguishable at compile time as well as at run
		// time.
		expectTypeOf(getBrand("plain")).toEqualTypeOf<"">();
		expectTypeOf(getBrand({ a: 1 })).toEqualTypeOf<"">();
	});
});

describe("the supporting types", () => {
	test("Ctor describes anything constructible into T", () => {
		assertType<Ctor<Point>>(Point);
		// @ts-expect-error - a plain function is not a constructor of Point.
		assertType<Ctor<Point>>((): Point => new Point(1, 2));
	});

	test("Resolve flattens an intersection but passes functions through", () => {
		expectTypeOf<Resolve<{ a: 1 } & { b: 2 }>>().toEqualTypeOf<{
			a: 1;
			b: 2;
		}>();
		expectTypeOf<Resolve<() => void>>().toEqualTypeOf<() => void>();
	});
});
