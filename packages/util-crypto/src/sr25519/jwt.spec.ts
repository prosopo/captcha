// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from "vitest";
import { jwtVerify } from "../jwt/jwtVerify.js";
import { randomAsU8a } from "../random/asU8a.js";
import { sr25519jwtIssue } from "./jwt.js";
import { sr25519FromSeed } from "./pair/fromSeed.js";

describe("jwtIssue", (): void => {
	beforeEach(() => {
		vi.useFakeTimers({ now: new Date("2024-01-01T00:00:00Z") });
	});

	it("issues a JWT with a valid format", (): void => {
		const pair = sr25519FromSeed(randomAsU8a());

		const jwt = sr25519jwtIssue(
			{
				publicKey: pair.publicKey,
				secretKey: pair.secretKey,
			},
			{ expiresIn: 300 },
		);

		expect(jwt).toBeDefined();
		expect(jwt.split(".")).toHaveLength(3);
		expect(jwt.split(".")[2]).toBeDefined();
	});
	it("throws an error for invalid secretKey length", (): void => {
		const pair = sr25519FromSeed(randomAsU8a());

		expect(() => {
			sr25519jwtIssue(
				{
					publicKey: pair.publicKey,
					secretKey: new Uint8Array(63), // Invalid length
				},
				{ expiresIn: 300 },
			);
		}).toThrow("Expected secretKey to be 64 bytes, found 63");
	});
	it("accepts a custom expiration time", (): void => {
		const pair = sr25519FromSeed(randomAsU8a());

		const jwt = sr25519jwtIssue(
			{
				publicKey: pair.publicKey,
				secretKey: pair.secretKey,
			},
			{ expiresIn: 600 }, // Custom expiration time
		);

		expect(jwt).toBeDefined();
		expect(jwt.split(".")).toHaveLength(3);
		expect(jwt.split(".")[2]).toBeDefined();

		const parts = jwt.split(".");

		if (!parts[1]) {
			throw new Error("Invalid JWT format: Missing payload part");
		}

		const payload = JSON.parse(atob(parts[1]));
		const exp = payload.exp;
		const now = Math.floor(Date.now() / 1000);
		expect(exp).toBeGreaterThanOrEqual(now + 600); // Ensure expiration is set correctly
	});
	it("accepts a custom start time", (): void => {
		const pair = sr25519FromSeed(randomAsU8a());
		const notBefore = Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000);

		const jwt = sr25519jwtIssue(
			{
				publicKey: pair.publicKey,
				secretKey: pair.secretKey,
			},
			{
				expiresIn: 300,
				notBefore: notBefore,
			}, // Custom start time
		);

		expect(jwt).toBeDefined();
		expect(jwt.split(".")).toHaveLength(3);
		expect(jwt.split(".")[2]).toBeDefined();

		const parts = jwt.split(".");

		if (!parts[1]) {
			throw new Error("Invalid JWT format: Missing payload part");
		}

		const payload = JSON.parse(atob(parts[1]));
		const notBeforeResult = payload.nbf;
		expect(notBefore).to.equal(notBeforeResult);
	});

	describe("extra message claims", (): void => {
		const decodePayload = (jwt: string): Record<string, unknown> => {
			const part = jwt.split(".")[1];
			if (!part) {
				throw new Error("Invalid JWT format: Missing payload part");
			}
			return JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
		};

		it("carries extra fields into the payload", (): void => {
			const pair = sr25519FromSeed(randomAsU8a());
			const jwt = sr25519jwtIssue(pair, { expiresIn: 300 }, { role: "admin" });
			expect(decodePayload(jwt).role).toBe("admin");
			expect(jwtVerify(jwt, pair.publicKey).isValid).toBe(true);
		});

		it("cannot replace the standard claims", (): void => {
			const pair = sr25519FromSeed(randomAsU8a());
			const other = sr25519FromSeed(randomAsU8a());
			const now = Math.floor(Date.now() / 1000);
			const jwt = sr25519jwtIssue(
				pair,
				{ expiresIn: 300 },
				{
					sub: `0x${"00".repeat(32)}`,
					iat: "0",
					nbf: "0",
					exp: "99999999999",
					role: "admin",
				},
			);
			const payload = decodePayload(jwt);
			expect(payload.exp).toBe(now + 300);
			expect(payload.iat).toBe(now);
			expect(payload.nbf).toBe(now);
			expect(payload.sub).not.toBe(`0x${"00".repeat(32)}`);
			expect(payload.role).toBe("admin");
			expect(jwtVerify(jwt, pair.publicKey).isValid).toBe(true);
			expect(jwtVerify(jwt, other.publicKey).isValid).toBe(false);
		});
	});
});
