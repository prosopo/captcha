// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { u8aConcat, u8aToHex, u8aWrapBytes } from "@polkadot/util";
import { describe, expect, it } from "vitest";
import { base64URLDecode, base64URLEncode } from "../base64/bs64.js";
import {
	sr25519FromSeed,
	sr25519Sign,
	sr25519jwtIssue,
} from "../sr25519/index.js";
import type { JWT, Keypair } from "../types.js";
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

const signingPair: Keypair = sr25519FromSeed(new Uint8Array(32).fill(2));

const payloadFor = (publicKey: Uint8Array): Record<string, unknown> => {
	const now = Math.floor(Date.now() / 1000);
	return { sub: u8aToHex(publicKey), iat: now, nbf: now, exp: now + 300 };
};

const signToken = (
	header: unknown,
	payload: unknown,
	signMessage: (signingInput: string) => Uint8Array = (signingInput) =>
		sr25519Sign(signingInput, signingPair),
): JWT => {
	const signingInput = `${base64URLEncode(JSON.stringify(header))}.${base64URLEncode(JSON.stringify(payload))}`;
	return `${signingInput}.${base64URLEncode(signMessage(signingInput))}`;
};

describe("jwtVerify algorithm pinning", (): void => {
	it("accepts the header sr25519jwtIssue writes", (): void => {
		const token = sr25519jwtIssue(signingPair);
		const [headerPart] = token.split(".");
		expect(
			JSON.parse(new TextDecoder().decode(base64URLDecode(headerPart ?? ""))),
		).toEqual({
			alg: "sr25519",
			typ: "JWT",
		});
		expect(jwtVerify(token, signingPair.publicKey).isValid).toBe(true);
	});

	it.each<[string, unknown]>([
		["none", { alg: "none", typ: "JWT" }],
		["HS256", { alg: "HS256", typ: "JWT" }],
		["ed25519", { alg: "ed25519", typ: "JWT" }],
		["ecdsa", { alg: "ecdsa", typ: "JWT" }],
		["upper case", { alg: "SR25519", typ: "JWT" }],
		["missing alg", { typ: "JWT" }],
		["non-string alg", { alg: 1, typ: "JWT" }],
		["array alg", { alg: ["sr25519"], typ: "JWT" }],
		["null header", null],
		["string header", "sr25519"],
	])("rejects a validly signed token whose header is %s", (_, header): void => {
		const token = signToken(header, payloadFor(signingPair.publicKey));
		const result = jwtVerify(token, signingPair.publicKey);
		expect(result.isValid).toBe(false);
		expect(result.error).toBe("Unsupported JWT algorithm");
	});

	it("rejects a signature over the <Bytes>-wrapped signing input", (): void => {
		const token = signToken(
			{ alg: "sr25519", typ: "JWT" },
			payloadFor(signingPair.publicKey),
			(signingInput) =>
				sr25519Sign(
					u8aWrapBytes(new TextEncoder().encode(signingInput)),
					signingPair,
				),
		);
		expect(jwtVerify(token, signingPair.publicKey).isValid).toBe(false);
	});

	it("rejects a multisig-prefixed signature", (): void => {
		const token = signToken(
			{ alg: "sr25519", typ: "JWT" },
			payloadFor(signingPair.publicKey),
			(signingInput) =>
				u8aConcat(new Uint8Array([1]), sr25519Sign(signingInput, signingPair)),
		);
		expect(jwtVerify(token, signingPair.publicKey).isValid).toBe(false);
	});

	it("rejects a signature of the wrong length without throwing", (): void => {
		const token = signToken(
			{ alg: "sr25519", typ: "JWT" },
			payloadFor(signingPair.publicKey),
			(signingInput) => sr25519Sign(signingInput, signingPair).subarray(0, 63),
		);
		expect(jwtVerify(token, signingPair.publicKey).isValid).toBe(false);
	});

	it("reports sr25519 as the crypto of a valid token", (): void => {
		const result = jwtVerify(
			sr25519jwtIssue(signingPair),
			signingPair.publicKey,
		);
		expect(result).toMatchObject({
			isValid: true,
			crypto: "sr25519",
			isWrapped: false,
		});
	});
});
