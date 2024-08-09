import { describe, expect, expectTypeOf, test } from "vitest";
// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import {
	type Brand,
	brand,
	brandClass,
	brandKey,
	getBrand,
	unbrand,
} from "../index.js";

type IfEquals<X, Y, A = X, B = never> = (<T>() => T extends X ? 1 : 2) extends <
	T,
>() => T extends Y ? 1 : 2
	? A
	: B;

describe("brand", () => {
	test("type branding", () => {
		type A = Brand<
			{
				c: true;
			},
			"A"
		>;

		type B = Brand<
			{
				c: true;
			},
			"B"
		>;

		type C<T> = T extends A ? true : false;

		type a = C<A>;
		type b = C<B>;

		// expect the types to be true/false appropriately
		const c: b = false;
		const d: a = true;

		// expect the types to be unequal
		type e = IfEquals<A, B, true, false>;
		const f: e = false; // expect false
	});

	test("branding classes", () => {
		class A {
			constructor(public x: number) {}
		}

		const ABranded = brandClass(A, "A");

		const aBrandedInst = new ABranded(1);

		expectTypeOf(aBrandedInst).toMatchTypeOf<{
			x: number;
		}>();

		expectTypeOf(aBrandedInst).toMatchTypeOf<Brand<A, "A">>();
	});

	test("get brand", () => {
		class A {
			constructor(public x: number) {}
		}

		const ABranded = brandClass(A, "A");

		const aBrandedInst = new ABranded(1);

		const brand2 = getBrand(aBrandedInst);

		expectTypeOf(brand2).toMatchTypeOf<"A">();
	});

	test("get brand - no brand", () => {
		class A {
			constructor(public x: number) {}
		}

		const a = new A(1);

		const brand2 = getBrand(a);

		expect(brand2).toBe("");
		expectTypeOf(brand2).toMatchTypeOf<"">();
	});

	test("unbrand", () => {
		class A {
			constructor(public x: number) {}
		}

		const ABranded = brand(A, "A");

		const aBrandedInst = new ABranded(1);

		const a = unbrand(aBrandedInst);

		expect(getBrand(a)).toBe("");
		expectTypeOf(a).toMatchTypeOf<A>();
	});

	test("branded classes are not equal", () => {
		class A {
			constructor(public x: number) {}
		}

		const ABranded = brandClass(A, "A");
		const BBranded = brandClass(A, "B");

		const a = new ABranded(1);
		const b = new BBranded(1);

		expectTypeOf(a[brandKey]).toMatchTypeOf<"A">();
		expectTypeOf(b[brandKey]).toMatchTypeOf<"B">();

		expectTypeOf(a).not.toEqualTypeOf(b);
		type c = IfEquals<typeof a, typeof b, true, false>;
		const d: c = false; // should not be equal
	});

	test("instance branding", () => {
		class A {
			constructor(public x: number) {}
		}

		const a = new A(1);
		const aBranded = brand(a, "A");

		expectTypeOf(getBrand(aBranded)).toMatchTypeOf<"A">();
		expectTypeOf(aBranded).toMatchTypeOf<Brand<A, "A">>();
	});
});
