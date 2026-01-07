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

/**
 * Type tests for @prosopo/util-crypto
 *
 * These tests verify TypeScript type relationships and type guards.
 * They ensure type safety and correct type inference throughout the codebase.
 */

import { describe, expect, expectTypeOf, it } from "vitest";
import type {
	JWT,
	JWTHeader,
	JWTVerifyResult,
	Keypair,
	KeypairType,
	Seedpair,
	VerifyResult,
} from "./types.js";
import { validateAddress } from "./address/index.js";
import { isBase32 } from "./base32/index.js";

describe("Type Guards", () => {
	// Test type guards that narrow types at runtime
	it("validateAddress narrows string | null | undefined to string", () => {
		const validAddress = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
		const invalidInput = null;

		// Test valid input narrows to string
		if (validateAddress(validAddress)) {
			expectTypeOf(validAddress).toBeString();
		}

		// Test invalid input remains unknown
		if (!validateAddress(invalidInput)) {
			expectTypeOf(invalidInput).toEqualTypeOf<string | null | undefined>();
		}
	});

	it("isBase32 narrows unknown to string", () => {
		const validBase32 = "abc123def";
		const invalidInput = 123;

		// Test valid input narrows to string
		if (isBase32(validBase32)) {
			expectTypeOf(validBase32).toBeString();
		}

		// Test invalid input remains unknown
		if (!isBase32(invalidInput)) {
			expectTypeOf(invalidInput).toEqualTypeOf<unknown>();
		}
	});
});

describe("Type Relationships", () => {
	// Test inheritance and extension relationships
	it("JWTVerifyResult extends VerifyResult", () => {
		const verifyResult: VerifyResult = {
			crypto: "sr25519",
			isValid: true,
			isWrapped: false,
			publicKey: new Uint8Array(32),
		};

		const jwtVerifyResult: JWTVerifyResult = {
			...verifyResult,
			payload: {
				sub: "test-subject",
				iat: 1234567890,
				exp: 1234567900,
			},
			error: undefined,
		};

		// JWTVerifyResult should be assignable to VerifyResult
		expectTypeOf(jwtVerifyResult).toMatchTypeOf<VerifyResult>();
		expectTypeOf(verifyResult).not.toMatchTypeOf<JWTVerifyResult>();
	});

	it("JWT is a branded string type", () => {
		const jwt: JWT = "header.payload.signature";

		// JWT should be assignable to string
		expectTypeOf(jwt).toBeString();

		// But string should not necessarily be assignable to JWT (branded type)
		const str = "any string";
		expectTypeOf(str).not.toMatchTypeOf<JWT>();
	});
});

describe("Union Types", () => {
	// Test union type constraints
	it("KeypairType only allows specific string literals", () => {
		const validTypes: KeypairType[] = ["ed25519", "sr25519", "ecdsa", "ethereum"];

		for (const type of validTypes) {
			expectTypeOf(type).toEqualTypeOf<KeypairType>();
		}

		// Invalid types should not match
		const invalidType = "invalid" as const;
		expectTypeOf(invalidType).not.toEqualTypeOf<KeypairType>();
	});
});

describe("Interface Compliance", () => {
	// Test that interfaces are correctly structured
	it("Keypair interface has required properties", () => {
		const keypair: Keypair = {
			publicKey: new Uint8Array(32),
			secretKey: new Uint8Array(64),
		};

		expectTypeOf(keypair.publicKey).toEqualTypeOf<Uint8Array>();
		expectTypeOf(keypair.secretKey).toEqualTypeOf<Uint8Array>();
	});

	it("Seedpair interface has required properties", () => {
		const seedpair: Seedpair = {
			publicKey: new Uint8Array(32),
			seed: new Uint8Array(32),
		};

		expectTypeOf(seedpair.publicKey).toEqualTypeOf<Uint8Array>();
		expectTypeOf(seedpair.seed).toEqualTypeOf<Uint8Array>();
	});

	it("JWTHeader has required algorithm field", () => {
		const header: JWTHeader = {
			alg: "sr25519",
			typ: "JWT",
		};

		expectTypeOf(header.alg).toEqualTypeOf<KeypairType>();
		expectTypeOf(header.typ).toEqualTypeOf<string | undefined>();
	});
});
