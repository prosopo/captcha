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

import type { Asset, AssetsResolver } from "@prosopo/types";
import { sealAssetPath } from "./assetSeal.js";
import { parseSealKeys } from "./assetSealFormat.js";

export const DEFAULT_ASSET_SEAL_TTL_SECONDS = 300;

export const DEFAULT_ASSET_SEAL_URL_PREFIX = "s";

export interface SealedAssetsResolverOptions {
	readonly key: Uint8Array;
	readonly keyId: number;
	readonly ttlSeconds?: number;
	readonly urlPrefix?: string;
	readonly now?: () => number;
}

export class SealedAssetsResolver implements AssetsResolver {
	private readonly key: Uint8Array;
	private readonly keyId: number;
	private readonly ttlSeconds: number;
	private readonly urlPrefix: string;
	private readonly now: () => number;

	constructor(options: SealedAssetsResolverOptions) {
		this.key = options.key;
		this.keyId = options.keyId;
		this.ttlSeconds = options.ttlSeconds ?? DEFAULT_ASSET_SEAL_TTL_SECONDS;
		this.urlPrefix = options.urlPrefix ?? DEFAULT_ASSET_SEAL_URL_PREFIX;
		this.now = options.now ?? (() => Date.now());
	}

	resolveAsset(assetURI: string): Asset {
		const url = this.toUrl(assetURI);

		if (!url) {
			return { URI: assetURI, getURL: (): string => assetURI };
		}

		if (url.search !== "") {
			throw new Error(
				`Cannot seal an asset URL that has a query string: ${assetURI}`,
			);
		}

		const blob = sealAssetPath({
			path: url.pathname,
			key: this.key,
			keyId: this.keyId,
			expiresAtSeconds: Math.floor(this.now() / 1000) + this.ttlSeconds,
		});

		const sealed = `${url.origin}/${this.urlPrefix}/${blob}${extensionOf(url.pathname)}`;

		return { URI: assetURI, getURL: (): string => sealed };
	}

	private toUrl(assetURI: string): URL | undefined {
		try {
			const url = new URL(assetURI);
			return url.protocol === "http:" || url.protocol === "https:"
				? url
				: undefined;
		} catch {
			return undefined;
		}
	}
}

const extensionOf = (pathname: string): string => {
	const lastDot = pathname.lastIndexOf(".");
	const lastSlash = pathname.lastIndexOf("/");
	if (lastDot <= lastSlash + 1) {
		return "";
	}
	const extension = pathname.slice(lastDot);
	return /^\.[a-zA-Z0-9]{1,8}$/.test(extension) ? extension : "";
};

export function getSealedAssetsResolver(): AssetsResolver | undefined {
	const spec = process.env.PROSOPO_ASSET_SEAL_KEYS;
	if (!spec) {
		return undefined;
	}

	const keys = parseSealKeys(spec);
	const keyId = activeKeyId(keys);
	const key = keys.get(keyId);
	if (!key) {
		throw new Error(
			`PROSOPO_ASSET_SEAL_ACTIVE_KEY_ID ${keyId} is not in PROSOPO_ASSET_SEAL_KEYS`,
		);
	}

	const ttlSeconds =
		Number.parseInt(process.env.PROSOPO_ASSET_SEAL_TTL_SECONDS ?? "", 10) ||
		DEFAULT_ASSET_SEAL_TTL_SECONDS;

	return new SealedAssetsResolver({
		key,
		keyId,
		ttlSeconds,
		urlPrefix:
			process.env.PROSOPO_ASSET_SEAL_URL_PREFIX ||
			DEFAULT_ASSET_SEAL_URL_PREFIX,
	});
}

const activeKeyId = (keys: ReadonlyMap<number, Uint8Array>): number => {
	const configured = process.env.PROSOPO_ASSET_SEAL_ACTIVE_KEY_ID;
	if (configured) {
		const parsed = Number.parseInt(configured, 10);
		if (!Number.isInteger(parsed)) {
			throw new Error("PROSOPO_ASSET_SEAL_ACTIVE_KEY_ID must be an integer");
		}
		return parsed;
	}
	return Math.max(...keys.keys());
};
