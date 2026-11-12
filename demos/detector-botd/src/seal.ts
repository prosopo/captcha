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

import type { OpenDetectorPayload, OpenDetectorToken } from "@prosopo/types";

const toBase64 = (bytes: ArrayBuffer | Uint8Array): string => {
	const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
	let binary = "";
	for (const byte of view) binary += String.fromCharCode(byte);
	return btoa(binary);
};

const fromBase64 = (base64: string): Uint8Array =>
	Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));

export const sha256Hex = async (text: string): Promise<string> => {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(text),
	);
	return Array.from(new Uint8Array(digest), (byte) =>
		byte.toString(16).padStart(2, "0"),
	).join("");
};

/**
 * Encrypt a payload into the token an open-format pool bundle sends: a fresh
 * AES-256-GCM key per payload, wrapped with the bundle's RSA-OAEP (SHA-256)
 * public key. A detector of your own only needs to build the payload and call
 * this.
 */
export const sealPayload = async (
	payload: OpenDetectorPayload,
	publicKeySpkiBase64: string,
): Promise<string> => {
	const rsaKey = await crypto.subtle.importKey(
		"spki",
		fromBase64(publicKeySpkiBase64),
		{ name: "RSA-OAEP", hash: "SHA-256" },
		false,
		["encrypt"],
	);
	const aesKey = await crypto.subtle.generateKey(
		{ name: "AES-GCM", length: 256 },
		true,
		["encrypt"],
	);
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const data = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv },
		aesKey,
		new TextEncoder().encode(JSON.stringify(payload)),
	);
	const key = await crypto.subtle.encrypt(
		{ name: "RSA-OAEP" },
		rsaKey,
		await crypto.subtle.exportKey("raw", aesKey),
	);
	const token: OpenDetectorToken = {
		v: 1,
		key: toBase64(key),
		iv: toBase64(iv),
		data: toBase64(data),
	};
	return JSON.stringify(token);
};
