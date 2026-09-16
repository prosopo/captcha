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
import { afterEach, describe, expect, test } from "vitest";
import {
	DEFAULT_ASSET_TOKEN_TTL_SECONDS,
	SignedAssetsResolver,
	getSignedAssetsResolver,
} from "../../api/captcha/signedAssetsResolver.js";

const KEY = "test-security-key";
const NOW_MS = 1_700_000_000_000;
const IMAGE = "https://prosopoimages.b-cdn.net/v5_dataset_flat/images/abc.webp";

const resolver = (
	ttlSeconds?: number,
	clientIp?: string,
): SignedAssetsResolver =>
	new SignedAssetsResolver({
		securityKey: KEY,
		now: () => NOW_MS,
		...(ttlSeconds !== undefined ? { ttlSeconds } : {}),
		...(clientIp !== undefined ? { clientIp } : {}),
	});

// The reference implementation, matching bunny.net's documented scheme.
const expected = (path: string, expires: number, ip = ""): string =>
	createHash("sha256")
		.update(`${KEY}${path}${expires}${ip}`)
		.digest("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=/g, "");

describe("SignedAssetsResolver", () => {
	test("signs the URL with a token and expiry", () => {
		const url = new URL(resolver(300).resolveAsset(IMAGE).getURL());
		const expires = NOW_MS / 1000 + 300;

		expect(url.origin + url.pathname).toBe(IMAGE);
		expect(url.searchParams.get("expires")).toBe(String(expires));
		expect(url.searchParams.get("token")).toBe(
			expected("/v5_dataset_flat/images/abc.webp", expires),
		);
	});

	test("preserves the original URI on the asset", () => {
		expect(resolver().resolveAsset(IMAGE).URI).toBe(IMAGE);
	});

	test("defaults to a short TTL", () => {
		const url = new URL(resolver().resolveAsset(IMAGE).getURL());
		expect(url.searchParams.get("expires")).toBe(
			String(NOW_MS / 1000 + DEFAULT_ASSET_TOKEN_TTL_SECONDS),
		);
	});

	// A token that worked for any path would let a scraper harvest one URL
	// and rewrite it across the whole pool.
	test("binds the token to its exact path", () => {
		const a = resolver().resolveAsset(IMAGE).getURL();
		const b = resolver()
			.resolveAsset(
				"https://prosopoimages.b-cdn.net/v5_dataset_flat/images/def.webp",
			)
			.getURL();
		const tokenOf = (u: string): string | null =>
			new URL(u).searchParams.get("token");
		expect(tokenOf(a)).not.toBe(tokenOf(b));
	});

	test("includes the client IP when bound", () => {
		const url = new URL(
			resolver(300, "203.0.113.9").resolveAsset(IMAGE).getURL(),
		);
		const expires = NOW_MS / 1000 + 300;
		expect(url.searchParams.get("token")).toBe(
			expected("/v5_dataset_flat/images/abc.webp", expires, "203.0.113.9"),
		);
	});

	test("passes non-http URIs through untouched", () => {
		const local = "/home/prosopo/images/abc.webp";
		expect(resolver().resolveAsset(local).getURL()).toBe(local);
	});

	// Silently emitting an unfetchable URL would surface as a broken captcha
	// rather than an error, so this must throw.
	test("refuses to sign a URL that already has a query string", () => {
		expect(() => resolver().resolveAsset(`${IMAGE}?w=100`)).toThrow(
			/already has a query string/,
		);
	});
});

describe("getSignedAssetsResolver", () => {
	afterEach(() => {
		process.env.PROSOPO_ASSET_TOKEN_KEY = undefined;
		process.env.PROSOPO_ASSET_TOKEN_BIND_IP = undefined;
	});

	// The feature must stay off until a key is deliberately supplied,
	// otherwise deploying this would 403 every image.
	test("is undefined when no key is configured", () => {
		process.env.PROSOPO_ASSET_TOKEN_KEY = "";
		expect(getSignedAssetsResolver()).toBeUndefined();
	});

	test("is constructed when a key is configured", () => {
		process.env.PROSOPO_ASSET_TOKEN_KEY = KEY;
		expect(getSignedAssetsResolver()).toBeInstanceOf(SignedAssetsResolver);
	});

	test("ignores the client IP unless binding is enabled", () => {
		process.env.PROSOPO_ASSET_TOKEN_KEY = KEY;
		const unbound = getSignedAssetsResolver("203.0.113.9");
		process.env.PROSOPO_ASSET_TOKEN_BIND_IP = "true";
		const bound = getSignedAssetsResolver("203.0.113.9");

		const tokenOf = (u: string): string | null =>
			new URL(u).searchParams.get("token");
		expect(tokenOf(unbound?.resolveAsset(IMAGE).getURL() ?? "")).not.toBe(
			tokenOf(bound?.resolveAsset(IMAGE).getURL() ?? ""),
		);
	});
});
