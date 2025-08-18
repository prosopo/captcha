// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { u8aToHex } from "@polkadot/util";
import { describe, expect, it } from "vitest";
import {
	sr25519FromSeed,
	sr25519Sign,
	sr25519jwtIssue,
} from "../sr25519/index.js";
import type { JWT } from "../types.js";
import { jwtVerify } from "./index.js";

describe("jwtSignatureVerify", (): void => {
	it("throws on invalid header/payload", (): void => {
		const invalidJwt = "blah.blah.blah";
		expect(() => jwtVerify(invalidJwt, new Uint8Array(32))).toThrow(
			"Invalid JWT format (cannot parse header/payload JSON)",
		);
	});
	it("throws on invalid JWT format", (): void => {
		const signature = new Uint8Array(64);
		const signatureHex = u8aToHex(signature);
		const invalidJwt = `blah.blah${signatureHex}` as JWT;
		expect(() => jwtVerify(invalidJwt, new Uint8Array(32))).toThrow(
			"Invalid JWT format",
		);
	});

	it("returns true on valid sr25519 JWT", (): void => {
		const { publicKey, secretKey } = sr25519FromSeed(
			new Uint8Array(32).fill(1),
		);
		const validJwt = sr25519jwtIssue(
			{
				publicKey,
				secretKey,
			},
			{ expiresIn: 300 },
		);
		const result = jwtVerify(validJwt, publicKey);
		expect(result.isValid).toBe(true);
	});
	it("returns false on expired sr25519 JWT", (): void => {
		const { publicKey, secretKey } = sr25519FromSeed(
			new Uint8Array(32).fill(1),
		);
		const validJwt = sr25519jwtIssue(
			{
				publicKey,
				secretKey,
			},
			{ expiresIn: -1 },
		);
		const result = jwtVerify(validJwt, publicKey);
		expect(result.isValid).toBe(false);
	});
});
