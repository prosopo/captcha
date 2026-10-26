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

import {
	type SealedPayload,
	additionalData,
	decodeEnvelope,
	decodePayload,
	isSafeAssetPath,
} from "../api/captcha/assetSealFormat.js";

const TAG_BYTES = 16;

export interface AssetSealHandlerOptions {
	readonly keys: ReadonlyMap<number, Uint8Array>;
	readonly urlPrefix: string;
	readonly requiredPathPrefix?: string;
	readonly now?: () => number;
}

export type AssetSealHandler = (
	request: Request,
) => Promise<Request | Response>;

const notFound = (): Response =>
	new Response("Not found", {
		status: 404,
		headers: {
			"content-type": "text/plain; charset=utf-8",
			"cache-control": "no-store",
		},
	});

export const createAssetSealHandler = (
	options: AssetSealHandlerOptions,
): AssetSealHandler => {
	const imported = new Map<number, Promise<CryptoKey>>();
	const now = options.now ?? ((): number => Date.now());
	const marker = `/${options.urlPrefix}/`;

	const keyFor = (keyId: number): Promise<CryptoKey> | undefined => {
		const raw = options.keys.get(keyId);
		if (!raw) {
			return undefined;
		}
		const existing = imported.get(keyId);
		if (existing) {
			return existing;
		}
		const promise = crypto.subtle.importKey(
			"raw",
			raw.slice(),
			{ name: "AES-GCM" },
			false,
			["decrypt"],
		);
		imported.set(keyId, promise);
		return promise;
	};

	const open = async (blob: string): Promise<string | undefined> => {
		const envelope = decodeEnvelope(blob);
		if (!envelope || envelope.sealed.length <= TAG_BYTES) {
			return undefined;
		}
		const key = keyFor(envelope.keyId);
		if (!key) {
			return undefined;
		}

		let payload: SealedPayload | undefined;
		try {
			const plaintext = await crypto.subtle.decrypt(
				{
					name: "AES-GCM",
					iv: envelope.iv,
					additionalData: additionalData(envelope.keyId),
					tagLength: TAG_BYTES * 8,
				},
				await key,
				envelope.sealed,
			);
			payload = decodePayload(new Uint8Array(plaintext));
		} catch {
			return undefined;
		}

		if (!payload || payload.expiresAtSeconds <= Math.floor(now() / 1000)) {
			return undefined;
		}
		return isSafeAssetPath(payload.path, options.requiredPathPrefix)
			? payload.path
			: undefined;
	};

	return async (request: Request): Promise<Request | Response> => {
		const url = new URL(request.url);

		if (!url.pathname.startsWith(marker)) {
			return request;
		}

		const path = await open(stripExtension(url.pathname.slice(marker.length)));
		if (!path) {
			return notFound();
		}

		url.pathname = path;
		url.search = "";
		return new Request(url, request);
	};
};

const stripExtension = (segment: string): string => {
	const dot = segment.indexOf(".");
	return dot === -1 ? segment : segment.slice(0, dot);
};
