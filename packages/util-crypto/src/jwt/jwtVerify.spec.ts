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

const claimsPair: Keypair = sr25519FromSeed(new Uint8Array(32).fill(3));

const signRawPayload = (payloadJson: string): JWT => {
	const signingInput = `${base64URLEncode(JSON.stringify({ alg: "sr25519", typ: "JWT" }))}.${base64URLEncode(payloadJson)}`;
	return `${signingInput}.${base64URLEncode(sr25519Sign(signingInput, claimsPair))}`;
};

const claimsJson = (overrides: Record<string, string>): string => {
	const now = Math.floor(Date.now() / 1000);
	const claims: Record<string, string> = {
		sub: JSON.stringify(u8aToHex(claimsPair.publicKey)),
		iat: String(now),
		nbf: String(now),
		exp: String(now + 300),
		...overrides,
	};
	return `{${Object.entries(claims)
		.map(([key, value]) => `${JSON.stringify(key)}:${value}`)
		.join(",")}}`;
};

describe("jwtVerify time and payload claims", (): void => {
	it("accepts a correctly signed token with integer claims", (): void => {
		const token = signRawPayload(claimsJson({}));
		expect(jwtVerify(token, claimsPair.publicKey).isValid).toBe(true);
	});

	it("accepts a token without nbf", (): void => {
		const now = Math.floor(Date.now() / 1000);
		const token = signRawPayload(
			JSON.stringify({
				sub: u8aToHex(claimsPair.publicKey),
				iat: now,
				exp: now + 300,
			}),
		);
		expect(jwtVerify(token, claimsPair.publicKey).isValid).toBe(true);
	});

	it.each<[string, Record<string, string>]>([
		["a non-numeric string nbf", { nbf: '"later"' }],
		["a numeric string nbf", { nbf: '"0"' }],
		["a boolean nbf", { nbf: "true" }],
		["a null nbf", { nbf: "null" }],
		["an object nbf", { nbf: "{}" }],
		["an array nbf", { nbf: "[]" }],
		["an exp that overflows to Infinity", { exp: "1e400" }],
		["an iat that overflows to Infinity", { iat: "1e400" }],
		["an nbf that overflows to -Infinity", { nbf: "-1e400" }],
	])("rejects %s", (_, overrides): void => {
		const result = jwtVerify(
			signRawPayload(claimsJson(overrides)),
			claimsPair.publicKey,
		);
		expect(result.isValid).toBe(false);
	});

	it.each<[string, string]>([
		["null", "null"],
		["an array", "[]"],
		["a string", '"payload"'],
		["a number", "1"],
	])(
		"returns invalid instead of throwing for a %s payload",
		(_, payloadJson): void => {
			const result = jwtVerify(
				signRawPayload(payloadJson),
				claimsPair.publicKey,
			);
			expect(result.isValid).toBe(false);
		},
	);

	it("returns invalid instead of throwing for a non-string sub", (): void => {
		const result = jwtVerify(
			signRawPayload(claimsJson({ sub: "123" })),
			claimsPair.publicKey,
		);
		expect(result).toMatchObject({
			isValid: false,
			error: "Invalid payload: 'sub' is not a string",
		});
	});

	it("still rejects a future nbf", (): void => {
		const future = Math.floor(Date.now() / 1000) + 600;
		const result = jwtVerify(
			sr25519jwtIssue(claimsPair, { notBefore: future }),
			claimsPair.publicKey,
		);
		expect(result).toMatchObject({
			isValid: false,
			error: "JWT not valid yet",
		});
	});
});
