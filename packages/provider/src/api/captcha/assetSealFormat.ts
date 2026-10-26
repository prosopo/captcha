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

//   blob      = base64url( version(1) | keyId(1) | iv(12) | ciphertext | tag(16) )
//   plaintext = expiry(uint32be seconds) | utf8 path
//   AAD       = version(1) | keyId(1)

export const SEAL_VERSION = 1;

export const IV_BYTES = 12;

const AAD_BYTES = 2;
const EXPIRY_BYTES = 4;
const MAX_KEY_ID = 255;

export const MAX_ASSET_PATH_LENGTH = 512;

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

export const SEAL_KEY_BYTES = 32;

export interface SealEnvelope {
	readonly keyId: number;
	readonly iv: Uint8Array;
	readonly sealed: Uint8Array;
}

export interface SealedPayload {
	readonly expiresAtSeconds: number;
	readonly path: string;
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder("utf-8", { fatal: true });

export const toBase64Url = (bytes: Uint8Array): string => {
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
};

export const fromBase64Url = (value: string): Uint8Array | undefined => {
	if (!BASE64URL_PATTERN.test(value)) {
		return undefined;
	}
	const normalised = value.replace(/-/g, "+").replace(/_/g, "/");
	const padded = normalised.padEnd(
		normalised.length + ((4 - (normalised.length % 4)) % 4),
		"=",
	);
	try {
		const binary = atob(padded);
		const bytes = new Uint8Array(binary.length);
		for (let index = 0; index < binary.length; index += 1) {
			bytes[index] = binary.charCodeAt(index);
		}
		return bytes;
	} catch {
		return undefined;
	}
};

export const additionalData = (keyId: number): Uint8Array =>
	new Uint8Array([SEAL_VERSION, keyId]);

export const encodeEnvelope = (envelope: SealEnvelope): string => {
	const bytes = new Uint8Array(
		AAD_BYTES + envelope.iv.length + envelope.sealed.length,
	);
	bytes.set(additionalData(envelope.keyId), 0);
	bytes.set(envelope.iv, AAD_BYTES);
	bytes.set(envelope.sealed, AAD_BYTES + envelope.iv.length);
	return toBase64Url(bytes);
};

export const decodeEnvelope = (blob: string): SealEnvelope | undefined => {
	const bytes = fromBase64Url(blob);
	if (!bytes || bytes.length <= AAD_BYTES + IV_BYTES) {
		return undefined;
	}
	if (bytes[0] !== SEAL_VERSION) {
		return undefined;
	}
	const keyId = bytes[1];
	if (undefined === keyId) {
		return undefined;
	}
	return {
		keyId,
		iv: bytes.slice(AAD_BYTES, AAD_BYTES + IV_BYTES),
		sealed: bytes.slice(AAD_BYTES + IV_BYTES),
	};
};

export const encodePayload = (payload: SealedPayload): Uint8Array => {
	const path = textEncoder.encode(payload.path);
	const bytes = new Uint8Array(EXPIRY_BYTES + path.length);
	new DataView(bytes.buffer).setUint32(0, payload.expiresAtSeconds, false);
	bytes.set(path, EXPIRY_BYTES);
	return bytes;
};

export const decodePayload = (bytes: Uint8Array): SealedPayload | undefined => {
	if (bytes.length <= EXPIRY_BYTES) {
		return undefined;
	}
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	try {
		return {
			expiresAtSeconds: view.getUint32(0, false),
			path: textDecoder.decode(bytes.subarray(EXPIRY_BYTES)),
		};
	} catch {
		return undefined;
	}
};

export const isSafeAssetPath = (
	path: string,
	requiredPrefix?: string,
): boolean => {
	if (!path.startsWith("/") || path.length > MAX_ASSET_PATH_LENGTH) {
		return false;
	}
	if (path.includes("..") || path.includes("//")) {
		return false;
	}
	// biome-ignore lint/suspicious/noControlCharactersInRegex: rejecting them is the point
	if (/[\u0000-\u001f\u007f]/.test(path)) {
		return false;
	}
	return undefined === requiredPrefix || path.startsWith(requiredPrefix);
};

export const parseSealKeys = (spec: string): Map<number, Uint8Array> => {
	const keys = new Map<number, Uint8Array>();
	for (const entry of spec.split(",")) {
		const trimmed = entry.trim();
		if ("" === trimmed) {
			continue;
		}
		const separator = trimmed.indexOf(":");
		if (separator <= 0) {
			throw new Error('Malformed seal key entry: expected "keyId:base64key"');
		}
		const keyId = Number(trimmed.slice(0, separator));
		if (!Number.isInteger(keyId) || keyId < 0 || keyId > MAX_KEY_ID) {
			throw new Error(`Seal key id must be an integer in [0, ${MAX_KEY_ID}]`);
		}
		const key = fromBase64Url(
			trimmed
				.slice(separator + 1)
				.replace(/\+/g, "-")
				.replace(/\//g, "_")
				.replace(/=+$/, ""),
		);
		if (!key || key.length !== SEAL_KEY_BYTES) {
			throw new Error(
				`Seal key ${keyId} must be ${SEAL_KEY_BYTES} base64-encoded bytes`,
			);
		}
		keys.set(keyId, key);
	}
	if (0 === keys.size) {
		throw new Error("No seal keys configured");
	}
	return keys;
};
