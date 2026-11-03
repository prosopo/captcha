// Copyright 2021-2026 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { generateKeyPairSync, webcrypto } from "node:crypto";
import type { OpenDetectorPayload, OpenDetectorToken } from "@prosopo/types";
import { describe, expect, it } from "vitest";
import { decodeOpenPayload } from "../../../../tasks/detection/openPayload.js";

const { publicKey, privateKey } = generateKeyPairSync("rsa", {
	modulusLength: 2048,
	publicKeyEncoding: { type: "spki", format: "der" },
	privateKeyEncoding: { type: "pkcs8", format: "pem" },
});
const privateKeyBase64: string = Buffer.from(privateKey).toString("base64");

const toBase64 = (bytes: ArrayBuffer | Uint8Array): string =>
	Buffer.from(
		bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes),
	).toString("base64");

// What a browser detector does with WebCrypto, written out here so the test
// pins the wire format rather than trusting one implementation to agree with
// itself.
const encrypt = async (plaintext: string): Promise<string> => {
	const rsaKey: webcrypto.CryptoKey = await webcrypto.subtle.importKey(
		"spki",
		publicKey,
		{ name: "RSA-OAEP", hash: "SHA-256" },
		false,
		["encrypt"],
	);
	const aesKey: webcrypto.CryptoKey = await webcrypto.subtle.generateKey(
		{ name: "AES-GCM", length: 256 },
		true,
		["encrypt"],
	);
	const iv: Uint8Array = webcrypto.getRandomValues(new Uint8Array(12));
	const data: ArrayBuffer = await webcrypto.subtle.encrypt(
		{ name: "AES-GCM", iv },
		aesKey,
		new TextEncoder().encode(plaintext),
	);
	const key: ArrayBuffer = await webcrypto.subtle.encrypt(
		{ name: "RSA-OAEP" },
		rsaKey,
		await webcrypto.subtle.exportKey("raw", aesKey),
	);
	const token: OpenDetectorToken = {
		v: 1,
		key: toBase64(key),
		iv: toBase64(iv),
		data: toBase64(data),
	};
	return JSON.stringify(token);
};

const payload: OpenDetectorPayload = {
	score: 1,
	timestamp: 1_790_000_000_000,
	userId: "5UserAccount",
	userAgent: "0123456789abcdef0123456789abcdef",
	headHash: "head-hash",
	isIframe: true,
	d: { bot: true, botKind: "headless_chrome" },
};

describe("decodeOpenPayload", () => {
	it("decodes a WebCrypto-encrypted payload", async () => {
		const token: string = await encrypt(JSON.stringify(payload));

		expect(decodeOpenPayload(token, "head-hash", privateKeyBase64)).toEqual({
			baseBotScore: 1,
			timestamp: 1_790_000_000_000,
			userId: "5UserAccount",
			userAgent: "0123456789abcdef0123456789abcdef",
			isWebView: false,
			isIframe: true,
			decryptedHeadHash: "head-hash",
			d: { bot: true, botKind: "headless_chrome" },
		});
	});

	it("rejects a token produced for a different head hash", async () => {
		const token: string = await encrypt(JSON.stringify(payload));

		expect(() =>
			decodeOpenPayload(token, "other-head-hash", privateKeyBase64),
		).toThrow();
	});

	it("rejects an empty head hash even when the payload carries none", async () => {
		const token: string = await encrypt(
			JSON.stringify({ ...payload, headHash: "" }),
		);

		expect(() => decodeOpenPayload(token, "", privateKeyBase64)).toThrow();
	});

	it("rejects a tampered ciphertext", async () => {
		const token: OpenDetectorToken = JSON.parse(
			await encrypt(JSON.stringify(payload)),
		);
		const data: Buffer = Buffer.from(token.data, "base64");
		data[0] = (data[0] ?? 0) ^ 0xff;

		expect(() =>
			decodeOpenPayload(
				JSON.stringify({ ...token, data: data.toString("base64") }),
				"head-hash",
				privateKeyBase64,
			),
		).toThrow();
	});

	it("rejects a payload missing a required field", async () => {
		const { userId: _omitted, ...withoutUser } = payload;
		const token: string = await encrypt(JSON.stringify(withoutUser));

		expect(() =>
			decodeOpenPayload(token, "head-hash", privateKeyBase64),
		).toThrow();
	});

	it("drops detector data that cannot be stored", async () => {
		const token: string = await encrypt(
			JSON.stringify({ ...payload, d: { "a.b": 1, ok: true } }),
		);

		expect(decodeOpenPayload(token, "head-hash", privateKeyBase64).d).toEqual({
			ok: true,
		});
	});
});
