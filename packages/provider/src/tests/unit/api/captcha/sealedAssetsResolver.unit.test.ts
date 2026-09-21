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

import { afterEach, describe, expect, test } from "vitest";
import { unsealAssetPath } from "../../../../api/captcha/assetSeal.js";
import {
	SEAL_KEY_BYTES,
	toBase64Url,
} from "../../../../api/captcha/assetSealFormat.js";
import {
	DEFAULT_ASSET_SEAL_TTL_SECONDS,
	SealedAssetsResolver,
	getSealedAssetsResolver,
} from "../../../../api/captcha/sealedAssetsResolver.js";

const KEY = new Uint8Array(SEAL_KEY_BYTES).fill(3);
const KEY_ID = 4;
const NOW_MS = 1_700_000_000_000;
const ORIGIN = "https://prosopoimages.b-cdn.net";
const PATH = "/v5_dataset_flat/images/abc.webp";
const IMAGE = `${ORIGIN}${PATH}`;

const resolver = (
	options: { ttlSeconds?: number; urlPrefix?: string } = {},
): SealedAssetsResolver =>
	new SealedAssetsResolver({
		key: KEY,
		keyId: KEY_ID,
		now: () => NOW_MS,
		...options,
	});

const opened = (sealedUrl: string, nowSeconds = NOW_MS / 1000): string => {
	const segments = new URL(sealedUrl).pathname.split("/");
	const blob = segments[segments.length - 1]?.replace(/\.[a-z0-9]+$/, "") ?? "";
	const path = unsealAssetPath({
		blob,
		keys: new Map([[KEY_ID, KEY]]),
		nowSeconds,
	});
	if (!path) throw new Error("expected the sealed URL to open");
	return path;
};

const withEnv = (
	values: Record<string, string | undefined>,
	run: () => void,
): void => {
	const saved = new Map<string, string | undefined>();
	for (const [name, value] of Object.entries(values)) {
		saved.set(name, process.env[name]);
		if (undefined === value) {
			Reflect.deleteProperty(process.env, name);
		} else {
			process.env[name] = value;
		}
	}
	try {
		run();
	} finally {
		for (const [name, value] of saved) {
			if (undefined === value) {
				Reflect.deleteProperty(process.env, name);
			} else {
				process.env[name] = value;
			}
		}
	}
};

describe("SealedAssetsResolver", () => {
	test("keeps the image on the same zone", () => {
		const url = new URL(resolver().resolveAsset(IMAGE).getURL());
		expect(url.origin).toBe(ORIGIN);
	});

	test("replaces the path with an opaque blob under the prefix", () => {
		const url = new URL(resolver().resolveAsset(IMAGE).getURL());
		expect(url.pathname).toMatch(/^\/s\/[A-Za-z0-9_-]+\.webp$/);
		expect(url.pathname).not.toContain("abc");
		expect(url.pathname).not.toContain("v5_dataset_flat");
	});

	test("the blob opens to the original path", () => {
		expect(opened(resolver().resolveAsset(IMAGE).getURL())).toBe(PATH);
	});

	test("gives the same image a different URL every time", () => {
		const instance = resolver();
		const urls = new Set(
			Array.from({ length: 20 }, () => instance.resolveAsset(IMAGE).getURL()),
		);
		expect(urls.size).toBe(20);
	});

	test("expires the URL after the ttl", () => {
		const url = resolver({ ttlSeconds: 120 }).resolveAsset(IMAGE).getURL();
		expect(opened(url, NOW_MS / 1000 + 119)).toBe(PATH);
		expect(() => opened(url, NOW_MS / 1000 + 120)).toThrow();
	});

	test("defaults to the same window as a signed URL", () => {
		const url = resolver().resolveAsset(IMAGE).getURL();
		expect(
			opened(url, NOW_MS / 1000 + DEFAULT_ASSET_SEAL_TTL_SECONDS - 1),
		).toBe(PATH);
		expect(() =>
			opened(url, NOW_MS / 1000 + DEFAULT_ASSET_SEAL_TTL_SECONDS),
		).toThrow();
	});

	test("honours a configured url prefix", () => {
		const url = new URL(
			resolver({ urlPrefix: "img" }).resolveAsset(IMAGE).getURL(),
		);
		expect(url.pathname.startsWith("/img/")).toBe(true);
	});

	test("carries the file extension over", () => {
		for (const [path, expected] of [
			["/a/b.webp", ".webp"],
			["/a/b.jpeg", ".jpeg"],
			["/a/b", ""],
			["/a/b.", ""],
		]) {
			const url = resolver().resolveAsset(`${ORIGIN}${path}`).getURL();
			expect(url.endsWith(`${expected}`)).toBe(true);
		}
	});

	test("preserves the original URI on the asset", () => {
		expect(resolver().resolveAsset(IMAGE).URI).toBe(IMAGE);
	});

	test("passes through anything that is not an http url", () => {
		for (const uri of ["/local/fixture.webp", "not a url", "file:///a.webp"]) {
			expect(resolver().resolveAsset(uri).getURL()).toBe(uri);
		}
	});

	test("refuses a url that already has a query string", () => {
		expect(() => resolver().resolveAsset(`${IMAGE}?v=2`)).toThrow(
			/query string/,
		);
	});
});

describe("getSealedAssetsResolver", () => {
	afterEach(() => {
		Reflect.deleteProperty(process.env, "PROSOPO_ASSET_SEAL_KEYS");
		Reflect.deleteProperty(process.env, "PROSOPO_ASSET_SEAL_ACTIVE_KEY_ID");
	});

	test("is off until keys are configured", () => {
		withEnv({ PROSOPO_ASSET_SEAL_KEYS: undefined }, () => {
			expect(getSealedAssetsResolver()).toBeUndefined();
		});
	});

	test("seals with the highest key id by default", () => {
		withEnv(
			{
				PROSOPO_ASSET_SEAL_KEYS: `1:${toBase64Url(new Uint8Array(SEAL_KEY_BYTES).fill(1))},${KEY_ID}:${toBase64Url(KEY)}`,
				PROSOPO_ASSET_SEAL_ACTIVE_KEY_ID: undefined,
			},
			() => {
				const url = getSealedAssetsResolver()?.resolveAsset(IMAGE).getURL();
				if (!url) throw new Error("expected a resolver");
				expect(opened(url, Math.floor(Date.now() / 1000))).toBe(PATH);
			},
		);
	});

	test("seals with the key id it is told to", () => {
		withEnv(
			{
				PROSOPO_ASSET_SEAL_KEYS: `${KEY_ID}:${toBase64Url(KEY)},9:${toBase64Url(new Uint8Array(SEAL_KEY_BYTES).fill(9))}`,
				PROSOPO_ASSET_SEAL_ACTIVE_KEY_ID: String(KEY_ID),
			},
			() => {
				const url = getSealedAssetsResolver()?.resolveAsset(IMAGE).getURL();
				if (!url) throw new Error("expected a resolver");
				expect(opened(url, Math.floor(Date.now() / 1000))).toBe(PATH);
			},
		);
	});

	test("refuses an active key id it does not hold", () => {
		withEnv(
			{
				PROSOPO_ASSET_SEAL_KEYS: `${KEY_ID}:${toBase64Url(KEY)}`,
				PROSOPO_ASSET_SEAL_ACTIVE_KEY_ID: "77",
			},
			() => {
				expect(() => getSealedAssetsResolver()).toThrow(/77/);
			},
		);
	});
});
