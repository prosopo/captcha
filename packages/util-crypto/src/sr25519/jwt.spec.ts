// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from "vitest";
import { randomAsU8a } from "../random/asU8a.js";
import { sr25519jwtIssue, sr25519jwtParts } from "./jwt.js";
import { sr25519FromSeed } from "./pair/fromSeed.js";
import type { JWT } from "../types.js";

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

	it("uses default expiration time when expiresIn is not provided", (): void => {
		const pair = sr25519FromSeed(randomAsU8a());

		const jwt = sr25519jwtIssue({
			publicKey: pair.publicKey,
			secretKey: pair.secretKey,
		});

		expect(jwt).toBeDefined();
		const parts = jwt.split(".");

		if (!parts[1]) {
			throw new Error("Invalid JWT format: Missing payload part");
		}

		const payload = JSON.parse(atob(parts[1]));
		const exp = payload.exp;
		const now = Math.floor(Date.now() / 1000);
		expect(exp).toBeGreaterThanOrEqual(now + 300);
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
});

describe("sr25519jwtParts", (): void => {
	it("splits a valid JWT into parts", (): void => {
		const pair = sr25519FromSeed(randomAsU8a());
		const jwt = sr25519jwtIssue(
			{
				publicKey: pair.publicKey,
				secretKey: pair.secretKey,
			},
			{ expiresIn: 300 },
		);

		const parts = sr25519jwtParts(jwt);

		expect(parts.header).toBeDefined();
		expect(parts.header.alg).toBe("sr25519");
		expect(parts.header.typ).toBe("JWT");
		expect(parts.payload).toBeDefined();
		expect(parts.payload.sub).toBeDefined();
		expect(parts.signature).toBeDefined();
	});

	it("throws error when JWT has invalid number of parts", (): void => {
		expect(() => sr25519jwtParts("invalid.jwt" as JWT)).toThrow(
			"Invalid JWT format, expected 3 parts, found 2",
		);
		expect(() => sr25519jwtParts("one.two.three.four" as JWT)).toThrow(
			"Invalid JWT format, expected 3 parts, found 4",
		);
	});

	it("throws error when JWT parts are empty", (): void => {
		expect(() => sr25519jwtParts(".." as JWT)).toThrow(
			"Invalid JWT format, parts cannot be empty",
		);
		expect(() => sr25519jwtParts("header.." as JWT)).toThrow(
			"Invalid JWT format, parts cannot be empty",
		);
		expect(() => sr25519jwtParts(".payload." as JWT)).toThrow(
			"Invalid JWT format, parts cannot be empty",
		);
	});
});
