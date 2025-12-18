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
import type { DeriveJunction } from "./DeriveJunction.js";
import { createSeedDeriveFn } from "./hdkdDerive.js";

describe("createSeedDeriveFn", (): void => {
	it("returns a derivation function", (): void => {
		const mockFromSeed = vi.fn();
		const mockDerive = vi.fn();
		const deriveFn = createSeedDeriveFn(mockFromSeed, mockDerive);
		expect(typeof deriveFn).toBe("function");
	});

	it("derives keypair for hard junction", (): void => {
		const mockPublicKey = new Uint8Array(32).fill(0x01);
		const mockSecretKey = new Uint8Array(64).fill(0x02);
		const derivedSeed = new Uint8Array(32).fill(0x03);
		const derivedKeypair: Keypair = {
			publicKey: new Uint8Array(32).fill(0x04),
			secretKey: new Uint8Array(64).fill(0x05),
		};

		const mockFromSeed = vi.fn(() => derivedKeypair);
		const mockDerive = vi.fn(() => derivedSeed);

		const deriveFn = createSeedDeriveFn(mockFromSeed, mockDerive);
		const keypair: Keypair = {
			publicKey: mockPublicKey,
			secretKey: mockSecretKey,
		};
		const junction: DeriveJunction = {
			chainCode: new Uint8Array(32).fill(0xaa),
			isHard: true,
		};

		const result = deriveFn(keypair, junction);

		// Should call derive with first 32 bytes of secret key and chain code
		expect(mockDerive).toHaveBeenCalledWith(
			keypair.secretKey.subarray(0, 32),
			junction.chainCode,
		);
		// Should call fromSeed with derived seed
		expect(mockFromSeed).toHaveBeenCalledWith(derivedSeed);
		// Should return derived keypair
		expect(result).toBe(derivedKeypair);
	});

	it("throws error for soft junction", (): void => {
		const mockFromSeed = vi.fn();
		const mockDerive = vi.fn();
		const deriveFn = createSeedDeriveFn(mockFromSeed, mockDerive);

		const keypair: Keypair = {
			publicKey: new Uint8Array(32),
			secretKey: new Uint8Array(64),
		};
		const softJunction: DeriveJunction = {
			chainCode: new Uint8Array(32),
			isHard: false,
		};

		expect(() => deriveFn(keypair, softJunction)).toThrow(
			"A soft key was found in the path and is not supported",
		);

		// Should not call derive or fromSeed
		expect(mockDerive).not.toHaveBeenCalled();
		expect(mockFromSeed).not.toHaveBeenCalled();
	});

	it("extracts only first 32 bytes of secret key", (): void => {
		const secretKey = new Uint8Array(64);
		for (let i = 0; i < 64; i++) {
			secretKey[i] = i;
		}

		const mockFromSeed = vi.fn();
		const mockDerive = vi.fn(() => new Uint8Array(32));

		const deriveFn = createSeedDeriveFn(mockFromSeed, mockDerive);
		const keypair: Keypair = {
			publicKey: new Uint8Array(32),
			secretKey,
		};
		const junction: DeriveJunction = {
			chainCode: new Uint8Array(32),
			isHard: true,
		};

		deriveFn(keypair, junction);

		// Check that only first 32 bytes were passed
		const passedSeed = mockDerive.mock.calls[0][0];
		expect(passedSeed).toHaveLength(32);
		// Verify it's the first 32 bytes
		for (let i = 0; i < 32; i++) {
			expect(passedSeed[i]).toBe(i);
		}
	});

	it("works with different chain codes", (): void => {
		const mockFromSeed = vi.fn((seed) => ({
			publicKey: new Uint8Array(32),
			secretKey: new Uint8Array(64),
		}));
		const mockDerive = vi.fn((seed, cc) => cc); // Return chain code as derived seed

		const deriveFn = createSeedDeriveFn(mockFromSeed, mockDerive);
		const keypair: Keypair = {
			publicKey: new Uint8Array(32),
			secretKey: new Uint8Array(64),
		};

		const chainCode1 = new Uint8Array(32).fill(0x01);
		const chainCode2 = new Uint8Array(32).fill(0x02);

		deriveFn(keypair, { chainCode: chainCode1, isHard: true });
		deriveFn(keypair, { chainCode: chainCode2, isHard: true });

		// Should have been called with different chain codes
		expect(mockDerive).toHaveBeenCalledWith(expect.any(Uint8Array), chainCode1);
		expect(mockDerive).toHaveBeenCalledWith(expect.any(Uint8Array), chainCode2);
	});

	it("preserves keypair structure", (): void => {
		const expectedKeypair: Keypair = {
			publicKey: new Uint8Array(32).fill(0xff),
			secretKey: new Uint8Array(64).fill(0xee),
		};

		const mockFromSeed = vi.fn(() => expectedKeypair);
		const mockDerive = vi.fn(() => new Uint8Array(32));

		const deriveFn = createSeedDeriveFn(mockFromSeed, mockDerive);
		const keypair: Keypair = {
			publicKey: new Uint8Array(32),
			secretKey: new Uint8Array(64),
		};
		const junction: DeriveJunction = {
			chainCode: new Uint8Array(32),
			isHard: true,
		};

		const result = deriveFn(keypair, junction);

		expect(result).toHaveProperty("publicKey");
		expect(result).toHaveProperty("secretKey");
		expect(result.publicKey).toBe(expectedKeypair.publicKey);
		expect(result.secretKey).toBe(expectedKeypair.secretKey);
	});
});

describe("createSeedDeriveFn types", (): void => {
	it("accepts correct function parameters", (): void => {
		expectTypeOf(createSeedDeriveFn).parameter(0).toBeFunction();
		expectTypeOf(createSeedDeriveFn).parameter(1).toBeFunction();
	});

	it("returns a function", (): void => {
		const mockFromSeed = (seed: Uint8Array): Keypair => ({
			publicKey: new Uint8Array(32),
			secretKey: new Uint8Array(64),
		});
		const mockDerive = (seed: Uint8Array, chainCode: Uint8Array): Uint8Array =>
			new Uint8Array(32);

		const deriveFn = createSeedDeriveFn(mockFromSeed, mockDerive);
		expectTypeOf(deriveFn).toBeFunction();
		expectTypeOf(deriveFn).returns.toEqualTypeOf<Keypair>();
	});

	it("derives function accepts Keypair and DeriveJunction", (): void => {
		const mockFromSeed = (seed: Uint8Array): Keypair => ({
			publicKey: new Uint8Array(32),
			secretKey: new Uint8Array(64),
		});
		const mockDerive = (seed: Uint8Array, chainCode: Uint8Array): Uint8Array =>
			new Uint8Array(32);

		const deriveFn = createSeedDeriveFn(mockFromSeed, mockDerive);
		expectTypeOf(deriveFn).parameter(0).toEqualTypeOf<Keypair>();
		expectTypeOf(deriveFn).parameter(1).toEqualTypeOf<DeriveJunction>();
	});
});
