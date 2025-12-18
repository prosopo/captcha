// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, expectTypeOf, it } from "vitest";
import { jsonDecrypt } from "./decrypt.js";
import { jsonEncrypt } from "./encrypt.js";

describe("jsonDecrypt", (): void => {
	it("decrypts data encrypted with passphrase", (): void => {
		const originalData = new Uint8Array([1, 2, 3, 4, 5]);
		const contentType = ["pkcs8", "sr25519"];
		const passphrase = "test123";

		const encrypted = jsonEncrypt(originalData, contentType, passphrase);
		const decrypted = jsonDecrypt(encrypted, passphrase);

		expect(decrypted).toEqual(originalData);
	});

	it("decrypts data without passphrase", (): void => {
		const originalData = new Uint8Array([1, 2, 3, 4, 5]);
		const contentType = ["pkcs8", "sr25519"];

		const encrypted = jsonEncrypt(originalData, contentType);
		const decrypted = jsonDecrypt(encrypted);

		expect(decrypted).toEqual(originalData);
	});

	it("throws error with wrong passphrase", (): void => {
		const originalData = new Uint8Array([1, 2, 3, 4, 5]);
		const contentType = ["pkcs8", "sr25519"];
		const passphrase = "test123";
		const wrongPassphrase = "wrong123";

		const encrypted = jsonEncrypt(originalData, contentType, passphrase);

		expect(() => jsonDecrypt(encrypted, wrongPassphrase)).toThrow(
			/Unable to decode/,
		);
	});

	it("throws error when no encoded data", (): void => {
		const encrypted = {
			encoded: "",
			encoding: {
				type: ["scrypt", "xsalsa20-poly1305"],
				content: ["pkcs8"],
				version: "3",
			},
		};

		expect(() => jsonDecrypt(encrypted, "test123")).toThrow(
			/No encrypted data/,
		);
	});

	it("works with hex encoded data", (): void => {
		const originalData = new Uint8Array([1, 2, 3, 4, 5]);
		const contentType = ["pkcs8", "sr25519"];

		const encrypted = jsonEncrypt(originalData, contentType);
		// Convert to hex format
		const hexEncrypted = {
			...encrypted,
			encoded: `0x${Buffer.from(encrypted.encoded, "base64").toString("hex")}`,
		};

		const decrypted = jsonDecrypt(hexEncrypted);

		expect(decrypted).toEqual(originalData);
	});

	it("works with empty data", (): void => {
		const originalData = new Uint8Array([]);
		const contentType = ["pkcs8"];

		const encrypted = jsonEncrypt(originalData, contentType);
		const decrypted = jsonDecrypt(encrypted);

		expect(decrypted).toEqual(originalData);
	});
});

describe("jsonDecrypt types", (): void => {
	it("returns Uint8Array", (): void => {
		const originalData = new Uint8Array([1, 2, 3, 4, 5]);
		const encrypted = jsonEncrypt(originalData, ["pkcs8"]);
		const result = jsonDecrypt(encrypted);
		expectTypeOf(result).toEqualTypeOf<Uint8Array>();
		expectTypeOf(result).not.toBeAny();
	});

	it("accepts correct parameter types", (): void => {
		const encrypted = jsonEncrypt(new Uint8Array([1]), ["pkcs8"]);
		expectTypeOf(jsonDecrypt).parameter(0).toMatchTypeOf<{
			encoded: string;
			encoding: unknown;
		}>();
		expectTypeOf(jsonDecrypt)
			.parameter(1)
			.toEqualTypeOf<string | null | undefined>();
	});
});
