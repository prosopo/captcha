// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, expectTypeOf, it } from "vitest";
import type { EncryptedJson } from "./types.js";
import { jsonEncrypt } from "./encrypt.js";

describe("jsonEncrypt", (): void => {
	it("encrypts data with passphrase", (): void => {
		const data = new Uint8Array([1, 2, 3, 4, 5]);
		const contentType = ["pkcs8", "sr25519"];
		const passphrase = "test123";

		const result = jsonEncrypt(data, contentType, passphrase);

		expect(result.encoded).toBeDefined();
		expect(result.encoding.type).toEqual(["scrypt", "xsalsa20-poly1305"]);
		expect(result.encoding.content).toEqual(contentType);
		expect(result.encoding.version).toBe("3");
	});

	it("does not encrypt data without passphrase", (): void => {
		const data = new Uint8Array([1, 2, 3, 4, 5]);
		const contentType = ["pkcs8", "sr25519"];

		const result = jsonEncrypt(data, contentType);

		expect(result.encoded).toBeDefined();
		expect(result.encoding.type).toEqual(["none"]);
		expect(result.encoding.content).toEqual(contentType);
		expect(result.encoding.version).toBe("3");
	});

	it("does not encrypt data with null passphrase", (): void => {
		const data = new Uint8Array([1, 2, 3, 4, 5]);
		const contentType = ["pkcs8", "sr25519"];

		const result = jsonEncrypt(data, contentType, null);

		expect(result.encoded).toBeDefined();
		expect(result.encoding.type).toEqual(["none"]);
		expect(result.encoding.content).toEqual(contentType);
	});

	it("produces different encrypted output for same data", (): void => {
		const data = new Uint8Array([1, 2, 3, 4, 5]);
		const contentType = ["pkcs8", "sr25519"];
		const passphrase = "test123";

		const result1 = jsonEncrypt(data, contentType, passphrase);
		const result2 = jsonEncrypt(data, contentType, passphrase);

		// Encrypted data should be different due to random salt/nonce
		expect(result1.encoded).not.toEqual(result2.encoded);
		expect(result1.encoding).toEqual(result2.encoding);
	});

	it("works with empty data", (): void => {
		const data = new Uint8Array([]);
		const contentType = ["pkcs8", "sr25519"];
		const passphrase = "test123";

		const result = jsonEncrypt(data, contentType, passphrase);

		expect(result.encoded).toBeDefined();
		expect(result.encoding.type).toEqual(["scrypt", "xsalsa20-poly1305"]);
	});

	it("works with single content type", (): void => {
		const data = new Uint8Array([1, 2, 3]);
		const contentType = ["pkcs8"];
		const passphrase = "test123";

		const result = jsonEncrypt(data, contentType, passphrase);

		expect(result.encoding.content).toEqual(["pkcs8"]);
	});
});

describe("jsonEncrypt types", (): void => {
	it("returns EncryptedJson", (): void => {
		const data = new Uint8Array([1, 2, 3]);
		const contentType = ["pkcs8"];
		const result = jsonEncrypt(data, contentType);
		expectTypeOf(result).toMatchTypeOf<EncryptedJson>();
		expectTypeOf(result).not.toBeAny();
	});

	it("accepts correct parameter types", (): void => {
		expectTypeOf(jsonEncrypt).parameter(0).toEqualTypeOf<Uint8Array>();
		expectTypeOf(jsonEncrypt).parameter(1).toEqualTypeOf<string[]>();
		expectTypeOf(jsonEncrypt).parameter(2).toEqualTypeOf<
			string | null | undefined
		>();
	});

	it("has correct EncryptedJson structure", (): void => {
		const data = new Uint8Array([1, 2, 3]);
		const result = jsonEncrypt(data, ["pkcs8"]);
		expectTypeOf(result.encoded).toBeString();
		expectTypeOf(result.encoding).toMatchTypeOf<{
			content: string[];
			type: string | string[];
			version: string;
		}>();
	});
});

