// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { stringToU8a, u8aToHex } from "@polkadot/util";
import { sign } from "@scure/sr25519";
import { describe, expect, it } from "vitest";
import { base64URLEncode } from "../base64/bs64.js";
import { sr25519FromSeed, sr25519jwtIssue } from "../sr25519/index.js";
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
		expect(result.error).toBe("JWT expired");
	});

	it("returns false when JWT not valid yet (nbf > now)", (): void => {
		const { publicKey, secretKey } = sr25519FromSeed(
			new Uint8Array(32).fill(1),
		);
		const futureTime = Math.floor(Date.now() / 1000) + 3600;
		const validJwt = sr25519jwtIssue(
			{
				publicKey,
				secretKey,
			},
			{ expiresIn: 300, notBefore: futureTime },
		);
		const result = jwtVerify(validJwt, publicKey);
		expect(result.isValid).toBe(false);
		expect(result.error).toBe("JWT not valid yet");
	});

	it("returns false when subject does not match publicKey", (): void => {
		const { publicKey, secretKey } = sr25519FromSeed(
			new Uint8Array(32).fill(1),
		);
		const { publicKey: otherPublicKey } = sr25519FromSeed(
			new Uint8Array(32).fill(2),
		);
		const validJwt = sr25519jwtIssue(
			{
				publicKey,
				secretKey,
			},
			{ expiresIn: 300 },
		);
		const result = jwtVerify(validJwt, otherPublicKey);
		expect(result.isValid).toBe(false);
		expect(result.error).toBe("Subject does not match publicKey");
	});

	it("returns false when exp or iat is not a number", (): void => {
		const { publicKey, secretKey } = sr25519FromSeed(
			new Uint8Array(32).fill(1),
		);
		const header = { alg: "sr25519", typ: "JWT" };
		const payload = {
			sub: u8aToHex(publicKey),
			iat: "not-a-number" as unknown as number,
			exp: Math.floor(Date.now() / 1000) + 300,
		};
		const signingInput = `${base64URLEncode(JSON.stringify(header))}.${base64URLEncode(JSON.stringify(payload))}`;
		const sig = sign(secretKey, stringToU8a(signingInput));
		const invalidJwt = `${signingInput}.${base64URLEncode(sig)}` as JWT;

		const result = jwtVerify(invalidJwt, publicKey);
		expect(result.isValid).toBe(false);
		expect(result.error).toBe(
			"Invalid payload: 'exp' or 'iat' is not a number",
		);
	});

	it("throws error when JWT has empty parts", (): void => {
		const invalidJwt = "header..signature" as JWT;
		expect(() => jwtVerify(invalidJwt, new Uint8Array(32))).toThrow(
			"Invalid JWT format (empty part)",
		);
	});
});
