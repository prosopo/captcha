// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { BN } from "@polkadot/util";
import { describe, expect, expectTypeOf, it } from "vitest";
import { DeriveJunction } from "./DeriveJunction.js";

describe("DeriveJunction", (): void => {
	describe("from", (): void => {
		it("creates soft junction from number string", (): void => {
			const junction = DeriveJunction.from("0");
			expect(junction.isSoft).toBe(true);
			expect(junction.isHard).toBe(false);
		});

		it("creates hard junction from path with slash", (): void => {
			const junction = DeriveJunction.from("/0");
			expect(junction.isSoft).toBe(false);
			expect(junction.isHard).toBe(true);
		});

		it("creates junction from hex string", (): void => {
			const junction = DeriveJunction.from("0x1234");
			expect(junction.isSoft).toBe(true);
			expect(junction.chainCode.length).toBe(32);
		});

		it("creates junction from regular string", (): void => {
			const junction = DeriveJunction.from("test");
			expect(junction.isSoft).toBe(true);
			expect(junction.chainCode.length).toBe(32);
		});
	});

	describe("soft", (): void => {
		it("sets soft junction from number", (): void => {
			const junction = new DeriveJunction().soft(42);
			expect(junction.isSoft).toBe(true);
			expect(junction.isHard).toBe(false);
		});

		it("sets soft junction from BN", (): void => {
			const junction = new DeriveJunction().soft(new BN(42));
			expect(junction.isSoft).toBe(true);
		});

		it("sets soft junction from bigint", (): void => {
			const junction = new DeriveJunction().soft(BigInt(42));
			expect(junction.isSoft).toBe(true);
		});

		it("sets soft junction from hex", (): void => {
			const junction = new DeriveJunction().soft("0x1234");
			expect(junction.isSoft).toBe(true);
		});

		it("sets soft junction from string", (): void => {
			const junction = new DeriveJunction().soft("test");
			expect(junction.isSoft).toBe(true);
		});

		it("sets soft junction from Uint8Array", (): void => {
			const data = new Uint8Array([1, 2, 3, 4]);
			const junction = new DeriveJunction().soft(data);
			expect(junction.isSoft).toBe(true);
			expect(junction.chainCode.subarray(0, 4)).toEqual(data);
		});

		it("hashes long strings", (): void => {
			const longString = "a".repeat(100);
			const junction = new DeriveJunction().soft(longString);
			expect(junction.isSoft).toBe(true);
			expect(junction.chainCode.length).toBe(32);
		});

		it("hashes long Uint8Arrays", (): void => {
			const longArray = new Uint8Array(100).fill(1);
			const junction = new DeriveJunction().soft(longArray);
			expect(junction.isSoft).toBe(true);
			expect(junction.chainCode.length).toBe(32);
		});
	});

	describe("hard", (): void => {
		it("sets hard junction from number", (): void => {
			const junction = new DeriveJunction().hard(42);
			expect(junction.isSoft).toBe(false);
			expect(junction.isHard).toBe(true);
		});

		it("sets hard junction from string", (): void => {
			const junction = new DeriveJunction().hard("test");
			expect(junction.isHard).toBe(true);
		});
	});

	describe("harden", (): void => {
		it("makes junction hard", (): void => {
			const junction = new DeriveJunction().soft(0).harden();
			expect(junction.isHard).toBe(true);
			expect(junction.isSoft).toBe(false);
		});

		it("returns self for chaining", (): void => {
			const junction = new DeriveJunction().soft(0).harden();
			expect(junction).toBeInstanceOf(DeriveJunction);
		});
	});

	describe("soften", (): void => {
		it("makes junction soft", (): void => {
			const junction = new DeriveJunction().hard(0).soften();
			expect(junction.isSoft).toBe(true);
			expect(junction.isHard).toBe(false);
		});

		it("returns self for chaining", (): void => {
			const junction = new DeriveJunction().hard(0).soften();
			expect(junction).toBeInstanceOf(DeriveJunction);
		});
	});

	describe("chainCode", (): void => {
		it("returns 32-byte chain code", (): void => {
			const junction = new DeriveJunction().soft(0);
			expect(junction.chainCode).toHaveLength(32);
		});

		it("is immutable", (): void => {
			const junction = new DeriveJunction().soft(0);
			const original = junction.chainCode;
			junction.soft(1);
			// Chain code should be different after changing
			expect(junction.chainCode).not.toEqual(original);
		});
	});

	describe("edge cases", (): void => {
		it("handles zero value", (): void => {
			const junction = new DeriveJunction().soft(0);
			expect(junction.isSoft).toBe(true);
		});

		it("handles large numbers", (): void => {
			const junction = new DeriveJunction().soft(Number.MAX_SAFE_INTEGER);
			expect(junction.isSoft).toBe(true);
		});

		it("handles empty string", (): void => {
			const junction = new DeriveJunction().soft("");
			expect(junction.isSoft).toBe(true);
		});

		it("handles exactly 32-byte input", (): void => {
			const data = new Uint8Array(32).fill(1);
			const junction = new DeriveJunction().soft(data);
			expect(junction.chainCode).toEqual(data);
		});
	});
});

describe("DeriveJunction types", (): void => {
	it("has correct property types", (): void => {
		const junction = new DeriveJunction().soft(0);
		expectTypeOf(junction.chainCode).toEqualTypeOf<Uint8Array>();
		expectTypeOf(junction.isHard).toEqualTypeOf<boolean>();
		expectTypeOf(junction.isSoft).toEqualTypeOf<boolean>();
	});

	it("from returns DeriveJunction", (): void => {
		const junction = DeriveJunction.from("0");
		expectTypeOf(junction).toMatchTypeOf<DeriveJunction>();
		expectTypeOf(junction).not.toBeAny();
	});

	it("soft accepts various input types", (): void => {
		const junction = new DeriveJunction();
		expectTypeOf(junction.soft)
			.parameter(0)
			.toEqualTypeOf<number | string | bigint | BN | Uint8Array>();
	});

	it("hard accepts various input types", (): void => {
		const junction = new DeriveJunction();
		expectTypeOf(junction.hard)
			.parameter(0)
			.toEqualTypeOf<number | string | bigint | BN | Uint8Array>();
	});

	it("methods return DeriveJunction for chaining", (): void => {
		const junction = new DeriveJunction();
		expectTypeOf(junction.soft(0)).toEqualTypeOf<DeriveJunction>();
		expectTypeOf(junction.hard(0)).toEqualTypeOf<DeriveJunction>();
		expectTypeOf(junction.harden()).toEqualTypeOf<DeriveJunction>();
		expectTypeOf(junction.soften()).toEqualTypeOf<DeriveJunction>();
	});
});
