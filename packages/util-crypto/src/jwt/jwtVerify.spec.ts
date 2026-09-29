// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { u8aToHex } from "@polkadot/util";
import { describe, expect, it } from "vitest";
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
	});

	describe("claim options", (): void => {
		const { publicKey, secretKey } = sr25519FromSeed(
			new Uint8Array(32).fill(1),
		);
		const issue = (
			claims: { [key: string]: string } = {},
			expiresIn = 300,
		): JWT => sr25519jwtIssue({ publicKey, secretKey }, { expiresIn }, claims);

		it("accepts a token whose aud is an accepted audience", (): void => {
			const jwt = issue({ aud: "https://pronode1.prosopo.io" });
			const result = jwtVerify(jwt, publicKey, {
				audience: ["https://pronode1.prosopo.io"],
			});
			expect(result.isValid).toBe(true);
		});

		it("rejects a token minted for another audience", (): void => {
			const jwt = issue({ aud: "https://pronode2.prosopo.io" });
			const result = jwtVerify(jwt, publicKey, {
				audience: ["https://pronode1.prosopo.io"],
			});
			expect(result.isValid).toBe(false);
			expect(result.error).toBe("JWT audience does not match");
		});

		it("still accepts a token without aud unless audience is required", (): void => {
			const jwt = issue();
			expect(
				jwtVerify(jwt, publicKey, { audience: ["pronode1.prosopo.io"] })
					.isValid,
			).toBe(true);
			const required = jwtVerify(jwt, publicKey, {
				audience: ["pronode1.prosopo.io"],
				requireAudience: true,
			});
			expect(required.isValid).toBe(false);
			expect(required.error).toBe("JWT has no audience");
		});

		it("rejects a token whose lifetime exceeds the maximum", (): void => {
			const result = jwtVerify(issue({}, 7200), publicKey, {
				maxLifetimeSeconds: 3600,
			});
			expect(result.isValid).toBe(false);
			expect(result.error).toBe("JWT lifetime exceeds the allowed maximum");
			expect(
				jwtVerify(issue({}, 3600), publicKey, { maxLifetimeSeconds: 3600 })
					.isValid,
			).toBe(true);
		});
	});
});
