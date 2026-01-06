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
import { lodash, rng, seedLodash, setSeedGlobal } from "./lodash.js";

describe("rng", () => {
	test("types", () => {
		const rand = rng(0);
		const _v1: number = rand.double();
		const _v2: number = rand.float();
		const _v3: number = rand.int();
		const _v4: number = rand.int32();
		const _v5: boolean = rand.bool();
	});

	test("generates random numbers using a seed", () => {
		const seed = 0;
		const rand = rng(seed);
		const expected = [
			-1681090547, 408334984, 788430095, 3233831872, 963300000, -299378919,
			97582850,
		];
		for (let i = 0; i < expected.length; i++) {
			expect(rand.int()).to.equal(expected[i]);
		}
	});

	test("generates consistent sequences with same seed", () => {
		const seed = "test-seed";
		const rand1 = rng(seed);
		const rand2 = rng(seed);

		for (let i = 0; i < 10; i++) {
			expect(rand1.int()).toBe(rand2.int());
			expect(rand1.double()).toBe(rand2.double());
			expect(rand1.float()).toBe(rand2.float());
			expect(rand1.int32()).toBe(rand2.int32());
			expect(rand1.bool()).toBe(rand2.bool());
		}
	});

	test("generates different sequences with different seeds", () => {
		const rand1 = rng("seed1");
		const rand2 = rng("seed2");

		const values1 = Array.from({ length: 10 }, () => rand1.int());
		const values2 = Array.from({ length: 10 }, () => rand2.int());

		expect(values1).not.toEqual(values2);
	});

	test("double returns values between 0 and 1", () => {
		const rand = rng(123);
		for (let i = 0; i < 100; i++) {
			const value = rand.double();
			expect(value).toBeGreaterThanOrEqual(0);
			expect(value).toBeLessThan(1);
		}
	});

	test("float returns values between 0 and 1", () => {
		const rand = rng(456);
		for (let i = 0; i < 100; i++) {
			const value = rand.float();
			expect(value).toBeGreaterThanOrEqual(0);
			expect(value).toBeLessThan(1);
		}
	});

	test("int32 returns 32-bit integers", () => {
		const rand = rng(789);
		for (let i = 0; i < 100; i++) {
			const value = rand.int32();
			expect(Number.isInteger(value)).toBe(true);
			expect(value).toBeGreaterThanOrEqual(-2147483648);
			expect(value).toBeLessThanOrEqual(2147483647);
		}
	});

	test("bool returns boolean values", () => {
		const rand = rng(999);
		for (let i = 0; i < 100; i++) {
			const value = rand.bool();
			expect(typeof value).toBe("boolean");
		}
	});

	test("handles numeric seed", () => {
		const rand = rng(42);
		expect(typeof rand.int()).toBe("number");
	});

	test("handles string seed", () => {
		const rand = rng("my-seed");
		expect(typeof rand.int()).toBe("number");
	});
});

describe("setSeedGlobal", () => {
	test("types", () => {
		const _v1: undefined = setSeedGlobal(0);
		const _v2: undefined = setSeedGlobal("seed");
	});

	test("sets global random seed", () => {
		setSeedGlobal(123);
		const val1 = Math.random();
		setSeedGlobal(123);
		const val2 = Math.random();
		expect(val1).toBe(val2);
	});

	test("handles string seed", () => {
		setSeedGlobal("test-seed");
		const val = Math.random();
		expect(typeof val).toBe("number");
		expect(val).toBeGreaterThanOrEqual(0);
		expect(val).toBeLessThan(1);
	});
});

describe("lodash", () => {
	test("types", () => {
		const _ = lodash();
		const _v1: typeof _ = _;
	});

	test("returns lodash instance", () => {
		const _ = lodash();
		expect(typeof _.shuffle).toBe("function");
		expect(typeof _.sample).toBe("function");
	});

	test("can use lodash functions", () => {
		const _ = lodash();
		const arr = [1, 2, 3, 4, 5];
		const shuffled = _.shuffle(arr);
		expect(shuffled).toHaveLength(5);
		expect(shuffled.sort()).toEqual([1, 2, 3, 4, 5]);
	});
});

describe("seedLodash", () => {
	test("types", () => {
		const _ = seedLodash(0);
		const _v1: typeof _ = _;
	});

	test("shuffles an array using a seed", () => {
		let array = [1, 2, 3, 4, 5];
		const seed = 0;
		const _ = seedLodash(seed);
		array = _.shuffle(array);
		expect(array).to.deep.equal([4, 2, 1, 3, 5]);
		array = _.shuffle(array);
		expect(array).to.deep.equal([3, 4, 1, 5, 2]);
		array = _.shuffle(array);
		expect(array).to.deep.equal([3, 4, 5, 2, 1]);
	});

	test("produces consistent results with same seed", () => {
		const seed = 42;
		const _1 = seedLodash(seed);
		const _2 = seedLodash(seed);

		const arr = [1, 2, 3, 4, 5];
		const shuffled1 = _1.shuffle([...arr]);
		const shuffled2 = _2.shuffle([...arr]);

		expect(shuffled1).toEqual(shuffled2);
	});

	test("produces different results with different seeds", () => {
		const _1 = seedLodash(1);
		const _2 = seedLodash(2);

		const arr = [1, 2, 3, 4, 5];
		const shuffled1 = _1.shuffle([...arr]);
		const shuffled2 = _2.shuffle([...arr]);

		expect(shuffled1).not.toEqual(shuffled2);
	});

	test("does not affect global Math.random after creation", () => {
		const originalRandom = Math.random;
		seedLodash(999);
		expect(Math.random).toBe(originalRandom);
	});

	test("handles string seed", () => {
		const _ = seedLodash("test-seed");
		const arr = [1, 2, 3];
		const shuffled = _.shuffle([...arr]);
		expect(shuffled).toHaveLength(3);
	});
});
