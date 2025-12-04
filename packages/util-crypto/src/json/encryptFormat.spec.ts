// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { jsonEncryptFormat } from "./encryptFormat.js";
import { ENCODING, ENCODING_NONE, ENCODING_VERSION } from "./constants.js";

describe("jsonEncryptFormat", (): void => {
	it("formats encrypted data", (): void => {
		const encoded = new Uint8Array([1, 2, 3, 4, 5]);
		const contentType = ["pkcs8", "sr25519"];
		const isEncrypted = true;

		const result = jsonEncryptFormat(encoded, contentType, isEncrypted);

		expect(result.encoded).toBeDefined();
		expect(result.encoding.type).toEqual(ENCODING);
		expect(result.encoding.content).toEqual(contentType);
		expect(result.encoding.version).toBe(ENCODING_VERSION);
	});

	it("formats unencrypted data", (): void => {
		const encoded = new Uint8Array([1, 2, 3, 4, 5]);
		const contentType = ["pkcs8", "sr25519"];
		const isEncrypted = false;

		const result = jsonEncryptFormat(encoded, contentType, isEncrypted);

		expect(result.encoded).toBeDefined();
		expect(result.encoding.type).toEqual(ENCODING_NONE);
		expect(result.encoding.content).toEqual(contentType);
		expect(result.encoding.version).toBe(ENCODING_VERSION);
	});

	it("encodes data as base64", (): void => {
		const encoded = new Uint8Array([1, 2, 3, 4, 5]);
		const contentType = ["pkcs8"];
		const isEncrypted = false;

		const result = jsonEncryptFormat(encoded, contentType, isEncrypted);

		// Base64 of [1,2,3,4,5] is "AQIDBAU="
		expect(result.encoded).toBe("AQIDBAU=");
	});

	it("works with empty data", (): void => {
		const encoded = new Uint8Array([]);
		const contentType = ["pkcs8"];
		const isEncrypted = true;

		const result = jsonEncryptFormat(encoded, contentType, isEncrypted);

		expect(result.encoded).toBe("");
		expect(result.encoding.type).toEqual(ENCODING);
	});

	it("preserves content type array", (): void => {
		const encoded = new Uint8Array([1, 2, 3]);
		const contentType = ["pkcs8", "sr25519", "publicKey"];
		const isEncrypted = true;

		const result = jsonEncryptFormat(encoded, contentType, isEncrypted);

		expect(result.encoding.content).toEqual(contentType);
	});
});

