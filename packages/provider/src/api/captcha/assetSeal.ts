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

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import {
	IV_BYTES,
	type SealedPayload,
	additionalData,
	decodeEnvelope,
	decodePayload,
	encodeEnvelope,
	encodePayload,
	isSafeAssetPath,
} from "./assetSealFormat.js";

const CIPHER = "aes-256-gcm";
const TAG_BYTES = 16;

export interface SealAssetPathParams {
	readonly path: string;
	readonly key: Uint8Array;
	readonly keyId: number;
	readonly expiresAtSeconds: number;
}

export const sealAssetPath = (params: SealAssetPathParams): string => {
	if (!isSafeAssetPath(params.path)) {
		throw new Error(`Refusing to seal an unusable asset path: ${params.path}`);
	}
	const iv = randomBytes(IV_BYTES);
	const cipher = createCipheriv(CIPHER, params.key, iv);
	cipher.setAAD(additionalData(params.keyId));
	const ciphertext = Buffer.concat([
		cipher.update(
			encodePayload({
				expiresAtSeconds: params.expiresAtSeconds,
				path: params.path,
			}),
		),
		cipher.final(),
	]);
	return encodeEnvelope({
		keyId: params.keyId,
		iv: new Uint8Array(iv),
		sealed: new Uint8Array(Buffer.concat([ciphertext, cipher.getAuthTag()])),
	});
};

export interface UnsealAssetPathParams {
	readonly blob: string;
	readonly keys: ReadonlyMap<number, Uint8Array>;
	readonly nowSeconds: number;
	readonly requiredPathPrefix?: string;
}

export const unsealAssetPath = (
	params: UnsealAssetPathParams,
): string | undefined => {
	const envelope = decodeEnvelope(params.blob);
	if (!envelope) {
		return undefined;
	}
	const key = params.keys.get(envelope.keyId);
	if (!key || envelope.sealed.length <= TAG_BYTES) {
		return undefined;
	}

	const payload = open(envelope.sealed, envelope.iv, key, envelope.keyId);
	if (!payload || payload.expiresAtSeconds <= params.nowSeconds) {
		return undefined;
	}
	return isSafeAssetPath(payload.path, params.requiredPathPrefix)
		? payload.path
		: undefined;
};

const open = (
	sealed: Uint8Array,
	iv: Uint8Array,
	key: Uint8Array,
	keyId: number,
): SealedPayload | undefined => {
	try {
		const decipher = createDecipheriv(CIPHER, key, iv);
		decipher.setAAD(additionalData(keyId));
		decipher.setAuthTag(sealed.subarray(sealed.length - TAG_BYTES));
		const plaintext = Buffer.concat([
			decipher.update(sealed.subarray(0, sealed.length - TAG_BYTES)),
			decipher.final(),
		]);
		return decodePayload(new Uint8Array(plaintext));
	} catch {
		return undefined;
	}
};
