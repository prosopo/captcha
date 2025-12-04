// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { naclEncrypt } from "../nacl/index.js";
import { scryptEncode, scryptToU8a } from "../scrypt/index.js";
import { jsonDecryptData } from "./decryptData.js";
import { ENCODING } from "./constants.js";

describe("jsonDecryptData", (): void => {
	it("decrypts data with scrypt and nacl", (): void => {
		const originalData = new Uint8Array([1, 2, 3, 4, 5]);
		const passphrase = "test123";
		const { params, password, salt } = scryptEncode(passphrase);
		const { encrypted, nonce } = naclEncrypt(
			originalData,
			password.subarray(0, 32),
		);

		const encryptedData = new Uint8Array([
			...scryptToU8a(salt, params),
			...nonce,
			...encrypted,
		]);

		const decrypted = jsonDecryptData(encryptedData, passphrase, ENCODING);

		expect(decrypted).toEqual(originalData);
	});

	it("throws error when no encrypted data", (): void => {
		expect(() => jsonDecryptData(null, "test123")).toThrow(
			/No encrypted data/,
		);
		expect(() => jsonDecryptData(undefined, "test123")).toThrow(
			/No encrypted data/,
		);
	});

	it("throws error when passphrase required but not provided", (): void => {
		const encrypted = new Uint8Array(100);
		expect(() =>
			jsonDecryptData(encrypted, null, ["xsalsa20-poly1305"]),
		).toThrow(/Password required/);
	});

	it("throws error when unable to decode", (): void => {
		const encrypted = new Uint8Array(100).fill(0);
		expect(() => jsonDecryptData(encrypted, "wrong", ENCODING)).toThrow(
			/Unable to decode/,
		);
	});

	it("works without passphrase when encoding is none", (): void => {
		const originalData = new Uint8Array([1, 2, 3, 4, 5]);
		const decrypted = jsonDecryptData(originalData, null, ["none"]);

		expect(decrypted).toEqual(originalData);
	});

	it("handles custom encoding types", (): void => {
		const originalData = new Uint8Array([1, 2, 3]);
		const passphrase = "test123";
		const { params, password, salt } = scryptEncode(passphrase);
		const { encrypted, nonce } = naclEncrypt(
			originalData,
			password.subarray(0, 32),
		);

		const encryptedData = new Uint8Array([
			...scryptToU8a(salt, params),
			...nonce,
			...encrypted,
		]);

		const decrypted = jsonDecryptData(encryptedData, passphrase, [
			"scrypt",
			"xsalsa20-poly1305",
		]);

		expect(decrypted).toEqual(originalData);
	});
});

