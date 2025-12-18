// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { isHex, u8aToHex } from "@polkadot/util";
import { describe, expect, it } from "vitest";
import { createAsHex, createBitHasher, createDualHasher } from "./helpers.js";

describe("createAsHex", (): void => {
	it("wraps a function to return hex string", (): void => {
		const fn = (input: string): Uint8Array => {
			return new TextEncoder().encode(input);
		};
		const hexFn = createAsHex(fn);
		const result = hexFn("test");
		expect(isHex(result)).toBe(true);
		expect(result).toEqual(u8aToHex(new TextEncoder().encode("test")));
	});

	it("preserves function parameters", (): void => {
		const fn = (a: string, b: number): Uint8Array => {
			return new Uint8Array([b]);
		};
		const hexFn = createAsHex(fn);
		const result = hexFn("test", 42);
		expect(result).toEqual("0x2a");
	});

	it("works with multiple parameters", (): void => {
		const fn = (a: string, b: number, c: boolean): Uint8Array => {
			return new Uint8Array([b, c ? 1 : 0]);
		};
		const hexFn = createAsHex(fn);
		const result = hexFn("test", 42, true);
		expect(result).toEqual("0x2a01");
	});
});

describe("createBitHasher", (): void => {
	it("creates a hasher with fixed bit length", (): void => {
		const mockHasher = (
			data: string | Uint8Array,
			bitLength: 256 | 512,
		): Uint8Array => {
			return new Uint8Array(bitLength === 256 ? 32 : 64);
		};
		const hasher256 = createBitHasher(256, mockHasher);
		const hasher512 = createBitHasher(512, mockHasher);

		const result256 = hasher256("test");
		const result512 = hasher512("test");

		expect(result256).toHaveLength(32);
		expect(result512).toHaveLength(64);
	});

	it("passes onlyJs parameter when provided", (): void => {
		let receivedOnlyJs: boolean | undefined;
		const mockHasher = (
			data: string | Uint8Array,
			bitLength: 256 | 512,
			onlyJs?: boolean,
		): Uint8Array => {
			receivedOnlyJs = onlyJs;
			return new Uint8Array(32);
		};
		const hasher = createBitHasher(256, mockHasher);

		hasher("test", true);
		expect(receivedOnlyJs).toBe(true);

		hasher("test", false);
		expect(receivedOnlyJs).toBe(false);

		hasher("test");
		expect(receivedOnlyJs).toBeUndefined();
	});
});

describe("createDualHasher", (): void => {
	it("creates a hasher that uses js implementation", (): void => {
		const jsHash256 = (u8a: Uint8Array): Uint8Array => {
			return new Uint8Array(32).fill(0x01);
		};
		const jsHash512 = (u8a: Uint8Array): Uint8Array => {
			return new Uint8Array(64).fill(0x02);
		};

		const hasher = createDualHasher(
			{ 256: jsHash256, 512: jsHash512 },
			{ 256: jsHash256, 512: jsHash512 },
		);

		const result256 = hasher("test", 256);
		const result512 = hasher("test", 512);

		expect(result256).toHaveLength(32);
		expect(result256[0]).toBe(0x01);
		expect(result512).toHaveLength(64);
		expect(result512[0]).toBe(0x02);
	});

	it("defaults to 256 bit length", (): void => {
		const jsHash256 = (u8a: Uint8Array): Uint8Array => {
			return new Uint8Array(32);
		};
		const jsHash512 = (u8a: Uint8Array): Uint8Array => {
			return new Uint8Array(64);
		};

		const hasher = createDualHasher(
			{ 256: jsHash256, 512: jsHash512 },
			{ 256: jsHash256, 512: jsHash512 },
		);

		const result = hasher("test");
		expect(result).toHaveLength(32);
	});

	it("works with Uint8Array input", (): void => {
		const jsHash256 = (u8a: Uint8Array): Uint8Array => {
			return u8a.slice(0, 32);
		};
		const jsHash512 = (u8a: Uint8Array): Uint8Array => {
			return u8a.slice(0, 64);
		};

		const hasher = createDualHasher(
			{ 256: jsHash256, 512: jsHash512 },
			{ 256: jsHash256, 512: jsHash512 },
		);

		const input = new Uint8Array([1, 2, 3, 4, 5]);
		const result = hasher(input, 256);
		expect(result).toHaveLength(32);
		expect(result[0]).toBe(1);
	});

	it("works with string input", (): void => {
		const jsHash256 = (u8a: Uint8Array): Uint8Array => {
			return new Uint8Array(32).fill(u8a.length);
		};
		const jsHash512 = (u8a: Uint8Array): Uint8Array => {
			return new Uint8Array(64).fill(u8a.length);
		};

		const hasher = createDualHasher(
			{ 256: jsHash256, 512: jsHash512 },
			{ 256: jsHash256, 512: jsHash512 },
		);

		const result = hasher("test", 256);
		expect(result).toHaveLength(32);
		expect(result[0]).toBeGreaterThan(0);
	});
});
