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

import { describe, expect, expectTypeOf, it, vi } from "vitest";
import type { Keypair } from "../types.js";
import { createDeriveFn } from "./derive.js";

// Mock @scure/sr25519 getPublicKey
vi.mock("@scure/sr25519", () => ({
	getPublicKey: vi.fn((secret: Uint8Array) => {
		// Mock returns a public key based on secret
		return new Uint8Array(32).fill(0xaa);
	}),
}));

// Mock sr25519PairFromU8a
vi.mock("./pair/fromU8a.js", () => ({
	sr25519PairFromU8a: vi.fn((u8a: Uint8Array) => {
		// Mock splits the input into secret and public keys
		const secretKey = u8a.subarray(0, 32);
		const publicKey = u8a.subarray(32, 64);
		return { secretKey, publicKey };
	}),
}));

describe("createDeriveFn", (): void => {
	it("returns a derivation function", (): void => {
		const mockDerive = vi.fn();
		const deriveFn = createDeriveFn(mockDerive);
		expect(typeof deriveFn).toBe("function");
	});

	it("derives keypair with valid chain code", (): void => {
		const derivedSecret = new Uint8Array(32).fill(0x03);
		const mockDerive = vi.fn(() => derivedSecret);

		const deriveFn = createDeriveFn(mockDerive);
		const keypair: Keypair = {
			publicKey: new Uint8Array(32).fill(0x01),
			secretKey: new Uint8Array(64).fill(0x02),
		};
		const chainCode = new Uint8Array(32).fill(0xbb);

		const result = deriveFn(keypair, chainCode);

		// Should call derive with secret key and chain code
		expect(mockDerive).toHaveBeenCalledWith(keypair.secretKey, chainCode);
		// Should return a keypair
		expect(result).toHaveProperty("publicKey");
		expect(result).toHaveProperty("secretKey");
	});

	it("throws error for non-Uint8Array chain code", (): void => {
		const mockDerive = vi.fn();
		const deriveFn = createDeriveFn(mockDerive);

		const keypair: Keypair = {
			publicKey: new Uint8Array(32),
			secretKey: new Uint8Array(64),
		};

		expect(() => deriveFn(keypair, "not-a-uint8array" as never)).toThrow(
			"Invalid chainCode passed to derive",
		);
		expect(mockDerive).not.toHaveBeenCalled();
	});

	it("throws error for chain code with wrong length", (): void => {
		const mockDerive = vi.fn();
		const deriveFn = createDeriveFn(mockDerive);

		const keypair: Keypair = {
			publicKey: new Uint8Array(32),
			secretKey: new Uint8Array(64),
		};
		const wrongLengthChainCode = new Uint8Array(16); // Should be 32

		expect(() => deriveFn(keypair, wrongLengthChainCode)).toThrow(
			"Invalid chainCode passed to derive",
		);
		expect(mockDerive).not.toHaveBeenCalled();
	});

	it("validates chain code is exactly 32 bytes", (): void => {
		const mockDerive = vi.fn(() => new Uint8Array(32));
		const deriveFn = createDeriveFn(mockDerive);

		const keypair: Keypair = {
			publicKey: new Uint8Array(32),
			secretKey: new Uint8Array(64),
		};

		// Test various invalid lengths
		expect(() => deriveFn(keypair, new Uint8Array(0))).toThrow(
			"Invalid chainCode passed to derive",
		);
		expect(() => deriveFn(keypair, new Uint8Array(31))).toThrow(
			"Invalid chainCode passed to derive",
		);
		expect(() => deriveFn(keypair, new Uint8Array(33))).toThrow(
			"Invalid chainCode passed to derive",
		);
		expect(() => deriveFn(keypair, new Uint8Array(64))).toThrow(
			"Invalid chainCode passed to derive",
		);

		// Valid 32-byte chain code should not throw
		expect(() => deriveFn(keypair, new Uint8Array(32))).not.toThrow();
	});

	it("passes full secret key to derive function", (): void => {
		const secretKey = new Uint8Array(64);
		for (let i = 0; i < 64; i++) {
			secretKey[i] = i;
		}

		const mockDerive = vi.fn(() => new Uint8Array(32));
		const deriveFn = createDeriveFn(mockDerive);

		const keypair: Keypair = {
			publicKey: new Uint8Array(32),
			secretKey,
		};
		const chainCode = new Uint8Array(32);

		deriveFn(keypair, chainCode);

		// Should pass entire secret key, not a subset
		expect(mockDerive).toHaveBeenCalledWith(secretKey, chainCode);
	});

	it("works with different chain codes", (): void => {
		const mockDerive = vi.fn(() => new Uint8Array(32));
		const deriveFn = createDeriveFn(mockDerive);

		const keypair: Keypair = {
			publicKey: new Uint8Array(32),
			secretKey: new Uint8Array(64),
		};

		const chainCode1 = new Uint8Array(32).fill(0x01);
		const chainCode2 = new Uint8Array(32).fill(0x02);

		deriveFn(keypair, chainCode1);
		deriveFn(keypair, chainCode2);

		expect(mockDerive).toHaveBeenNthCalledWith(
			1,
			keypair.secretKey,
			chainCode1,
		);
		expect(mockDerive).toHaveBeenNthCalledWith(
			2,
			keypair.secretKey,
			chainCode2,
		);
	});

	it("preserves keypair structure in result", (): void => {
		const mockDerive = vi.fn(() => new Uint8Array(32).fill(0x03));
		const deriveFn = createDeriveFn(mockDerive);

		const keypair: Keypair = {
			publicKey: new Uint8Array(32).fill(0x01),
			secretKey: new Uint8Array(64).fill(0x02),
		};
		const chainCode = new Uint8Array(32).fill(0xbb);

		const result = deriveFn(keypair, chainCode);

		expect(result).toHaveProperty("publicKey");
		expect(result).toHaveProperty("secretKey");
		expect(result.publicKey).toBeInstanceOf(Uint8Array);
		expect(result.secretKey).toBeInstanceOf(Uint8Array);
	});
});

describe("createDeriveFn types", (): void => {
	it("accepts derive function parameter", (): void => {
		expectTypeOf(createDeriveFn).parameter(0).toBeFunction();
	});

	it("returns a function", (): void => {
		const mockDerive = (pair: Uint8Array, cc: Uint8Array): Uint8Array =>
			new Uint8Array(32);

		const deriveFn = createDeriveFn(mockDerive);
		expectTypeOf(deriveFn).toBeFunction();
		expectTypeOf(deriveFn).returns.toEqualTypeOf<Keypair>();
	});

	it("derives function accepts Keypair and Uint8Array", (): void => {
		const mockDerive = (pair: Uint8Array, cc: Uint8Array): Uint8Array =>
			new Uint8Array(32);

		const deriveFn = createDeriveFn(mockDerive);
		expectTypeOf(deriveFn).parameter(0).toEqualTypeOf<Keypair>();
		expectTypeOf(deriveFn).parameter(1).toEqualTypeOf<Uint8Array>();
	});
});
