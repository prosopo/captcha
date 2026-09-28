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

import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
	DEFAULT_ASSET_TOKEN_TTL_SECONDS,
	assetTokenOptionsFromEnv,
	signAssetUrl,
} from "../captcha/assetToken.js";
import { downloadImage } from "../captcha/util.js";

const KEY = "test-security-key";
const NOW_MS = 1_700_000_000_000;
const NOW_SECONDS = NOW_MS / 1000;
const IMAGE = "https://prosopoimages.b-cdn.net/v5_dataset_flat/images/abc.webp";

// bunny's documented scheme, reproduced independently of the implementation.
const expectedToken = (path: string, expires: number, ip = ""): string =>
	createHash("sha256")
		.update(`${KEY}${path}${expires}${ip}`)
		.digest("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=/g, "");

const sign = (
	url: string,
	overrides: { ttlSeconds?: number; clientIp?: string } = {},
) => signAssetUrl(url, { securityKey: KEY, now: () => NOW_MS, ...overrides });

describe("signAssetUrl", () => {
	test("produces the token bunny would verify", async () => {
		const url = new URL(await sign(IMAGE));
		const expires = NOW_SECONDS + DEFAULT_ASSET_TOKEN_TTL_SECONDS;

		expect(url.origin + url.pathname).toBe(IMAGE);
		expect(url.searchParams.get("expires")).toBe(String(expires));
		expect(url.searchParams.get("token")).toBe(
			expectedToken("/v5_dataset_flat/images/abc.webp", expires),
		);
	});

	test("honours the ttl it is given", async () => {
		const url = new URL(await sign(IMAGE, { ttlSeconds: 60 }));
		expect(url.searchParams.get("expires")).toBe(String(NOW_SECONDS + 60));
	});

	test("binds to a client ip when one is supplied", async () => {
		const url = new URL(await sign(IMAGE, { clientIp: "203.0.113.7" }));
		const expires = NOW_SECONDS + DEFAULT_ASSET_TOKEN_TTL_SECONDS;

		expect(url.searchParams.get("token")).toBe(
			expectedToken("/v5_dataset_flat/images/abc.webp", expires, "203.0.113.7"),
		);
	});

	test("leaves an already-signed url alone", async () => {
		const signed = `${IMAGE}?token=abc&expires=123`;
		expect(await sign(signed)).toBe(signed);
	});

	test("passes through anything that is not an http url", async () => {
		for (const value of [
			"/local/fixture.webp",
			"not a url",
			"file:///a.webp",
		]) {
			expect(await sign(value)).toBe(value);
		}
	});
});

describe("assetTokenOptionsFromEnv", () => {
	const saved = { ...process.env };

	afterEach(() => {
		process.env = { ...saved };
	});

	test("is undefined until a key is configured", () => {
		Reflect.deleteProperty(process.env, "PROSOPO_ASSET_TOKEN_KEY");
		expect(assetTokenOptionsFromEnv()).toBeUndefined();
	});

	test("reads the key and ttl", () => {
		process.env.PROSOPO_ASSET_TOKEN_KEY = KEY;
		process.env.PROSOPO_ASSET_TOKEN_TTL_SECONDS = "45";
		expect(assetTokenOptionsFromEnv()).toEqual({
			securityKey: KEY,
			ttlSeconds: 45,
		});
	});

	test("falls back to the default ttl when it is unset or junk", () => {
		process.env.PROSOPO_ASSET_TOKEN_KEY = KEY;
		Reflect.deleteProperty(process.env, "PROSOPO_ASSET_TOKEN_TTL_SECONDS");
		expect(assetTokenOptionsFromEnv()?.ttlSeconds).toBe(
			DEFAULT_ASSET_TOKEN_TTL_SECONDS,
		);

		process.env.PROSOPO_ASSET_TOKEN_TTL_SECONDS = "not-a-number";
		expect(assetTokenOptionsFromEnv()?.ttlSeconds).toBe(
			DEFAULT_ASSET_TOKEN_TTL_SECONDS,
		);
	});
});

describe("downloadImage", () => {
	const saved = { ...process.env };
	const fetchMock = vi.fn<typeof fetch>();

	beforeEach(() => {
		fetchMock.mockReset();
		fetchMock.mockResolvedValue(
			new Response(new Uint8Array([1, 2, 3]), { status: 200 }),
		);
		vi.stubGlobal("fetch", fetchMock);
	});

	afterEach(() => {
		process.env = { ...saved };
		vi.unstubAllGlobals();
	});

	test("fetches the bare url when no key is configured", async () => {
		Reflect.deleteProperty(process.env, "PROSOPO_ASSET_TOKEN_KEY");

		await downloadImage(IMAGE);

		expect(fetchMock).toHaveBeenCalledWith(IMAGE);
	});

	test("signs the url when a key is configured", async () => {
		// Without this an import cannot hash its own images once the zone
		// starts enforcing token authentication.
		process.env.PROSOPO_ASSET_TOKEN_KEY = KEY;

		await downloadImage(IMAGE);

		const requested = new URL(String(fetchMock.mock.calls[0]?.[0]));
		expect(requested.origin + requested.pathname).toBe(IMAGE);
		expect(requested.searchParams.get("token")).toBeTruthy();
		expect(Number(requested.searchParams.get("expires"))).toBeGreaterThan(
			Date.now() / 1000,
		);
	});

	test("returns the bytes it downloaded", async () => {
		expect(await downloadImage(IMAGE)).toEqual(new Uint8Array([1, 2, 3]));
	});

	test("throws when the image cannot be fetched", async () => {
		fetchMock.mockResolvedValue(new Response("nope", { status: 403 }));

		await expect(downloadImage(IMAGE)).rejects.toThrow();
	});
});
