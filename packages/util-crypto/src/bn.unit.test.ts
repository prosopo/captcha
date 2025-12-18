// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import { describe, expect, it } from "vitest";
import {
	BN_BE_32_OPTS,
	BN_BE_256_OPTS,
	BN_BE_OPTS,
	BN_LE_16_OPTS,
	BN_LE_32_OPTS,
	BN_LE_256_OPTS,
	BN_LE_512_OPTS,
	BN_LE_OPTS,
} from "./bn.js";

describe("BN constants", (): void => {
	// Test basic endianness options
	it("BN_BE_OPTS has correct properties", (): void => {
		expect(BN_BE_OPTS).toEqual({ isLe: false });
	});

	it("BN_LE_OPTS has correct properties", (): void => {
		expect(BN_LE_OPTS).toEqual({ isLe: true });
	});

	// Test 16-bit options
	it("BN_LE_16_OPTS has correct properties", (): void => {
		expect(BN_LE_16_OPTS).toEqual({ bitLength: 16, isLe: true });
		expect(BN_LE_16_OPTS.bitLength).toBe(16);
		expect(BN_LE_16_OPTS.isLe).toBe(true);
	});

	// Test 32-bit options
	it("BN_BE_32_OPTS has correct properties", (): void => {
		expect(BN_BE_32_OPTS).toEqual({ bitLength: 32, isLe: false });
		expect(BN_BE_32_OPTS.bitLength).toBe(32);
		expect(BN_BE_32_OPTS.isLe).toBe(false);
	});

	it("BN_LE_32_OPTS has correct properties", (): void => {
		expect(BN_LE_32_OPTS).toEqual({ bitLength: 32, isLe: true });
		expect(BN_LE_32_OPTS.bitLength).toBe(32);
		expect(BN_LE_32_OPTS.isLe).toBe(true);
	});

	// Test 256-bit options
	it("BN_BE_256_OPTS has correct properties", (): void => {
		expect(BN_BE_256_OPTS).toEqual({ bitLength: 256, isLe: false });
		expect(BN_BE_256_OPTS.bitLength).toBe(256);
		expect(BN_BE_256_OPTS.isLe).toBe(false);
	});

	it("BN_LE_256_OPTS has correct properties", (): void => {
		expect(BN_LE_256_OPTS).toEqual({ bitLength: 256, isLe: true });
		expect(BN_LE_256_OPTS.bitLength).toBe(256);
		expect(BN_LE_256_OPTS.isLe).toBe(true);
	});

	// Test 512-bit options
	it("BN_LE_512_OPTS has correct properties", (): void => {
		expect(BN_LE_512_OPTS).toEqual({ bitLength: 512, isLe: true });
		expect(BN_LE_512_OPTS.bitLength).toBe(512);
		expect(BN_LE_512_OPTS.isLe).toBe(true);
	});

	// Verify endianness consistency
	it("BE constants have isLe: false", (): void => {
		expect(BN_BE_OPTS.isLe).toBe(false);
		expect(BN_BE_32_OPTS.isLe).toBe(false);
		expect(BN_BE_256_OPTS.isLe).toBe(false);
	});

	it("LE constants have isLe: true", (): void => {
		expect(BN_LE_OPTS.isLe).toBe(true);
		expect(BN_LE_16_OPTS.isLe).toBe(true);
		expect(BN_LE_32_OPTS.isLe).toBe(true);
		expect(BN_LE_256_OPTS.isLe).toBe(true);
		expect(BN_LE_512_OPTS.isLe).toBe(true);
	});

	// Verify constants are objects
	it("all constants are objects", (): void => {
		expect(typeof BN_BE_OPTS).toBe("object");
		expect(typeof BN_LE_OPTS).toBe("object");
		expect(typeof BN_LE_16_OPTS).toBe("object");
		expect(typeof BN_BE_32_OPTS).toBe("object");
		expect(typeof BN_LE_32_OPTS).toBe("object");
		expect(typeof BN_BE_256_OPTS).toBe("object");
		expect(typeof BN_LE_256_OPTS).toBe("object");
		expect(typeof BN_LE_512_OPTS).toBe("object");
	});
});
