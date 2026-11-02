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

import { describe, expect, test } from "vitest";
import { sealAssetPath } from "../../../api/captcha/assetSeal.js";
import { SEAL_KEY_BYTES } from "../../../api/captcha/assetSealFormat.js";
import {
	SealedAssetsResolver,
	getSealedAssetsResolver,
} from "../../../api/captcha/sealedAssetsResolver.js";
import {
	type AssetSealHandler,
	createAssetSealHandler,
} from "../../../edge/assetSealHandler.js";

const KEY = new Uint8Array(SEAL_KEY_BYTES).fill(5);
const OTHER_KEY = new Uint8Array(SEAL_KEY_BYTES).fill(6);
const KEY_ID = 2;
const NOW_MS = 1_700_000_000_000;
const NOW_SECONDS = NOW_MS / 1000;
const ZONE = "https://prosopoimages.b-cdn.net";
const PATH = "/v5_dataset_flat/images/abc.webp";

const handler = (
	options: {
		keys?: Map<number, Uint8Array>;
		urlPrefix?: string;
		requiredPathPrefix?: string;
		nowMs?: number;
	} = {},
): AssetSealHandler =>
	createAssetSealHandler({
		keys: options.keys ?? new Map([[KEY_ID, KEY]]),
		urlPrefix: options.urlPrefix ?? "s",
		now: () => options.nowMs ?? NOW_MS,
		...(options.requiredPathPrefix !== undefined
			? { requiredPathPrefix: options.requiredPathPrefix }
			: {}),
	});

const sealedUrl = (
	options: {
		path?: string;
		key?: Uint8Array;
		keyId?: number;
		ttl?: number;
	} = {},
): string =>
	`${ZONE}/s/${sealAssetPath({
		path: options.path ?? PATH,
		key: options.key ?? KEY,
		keyId: options.keyId ?? KEY_ID,
		expiresAtSeconds: NOW_SECONDS + (options.ttl ?? 300),
	})}.webp`;

const rewritten = async (
	url: string,
	handle: AssetSealHandler = handler(),
): Promise<Request | Response> => handle(new Request(url));

describe("a sealed request", () => {
	test("is rewritten onto the canonical path", async () => {
		const result = await rewritten(sealedUrl());

		expect(result).toBeInstanceOf(Request);
		expect(new URL((result as Request).url).pathname).toBe(PATH);
	});

	test("keeps the zone it arrived on", async () => {
		const result = await rewritten(sealedUrl());

		expect(new URL((result as Request).url).origin).toBe(ZONE);
	});

	test("carries the method and headers over", async () => {
		const result = await handler()(
			new Request(sealedUrl(), {
				method: "GET",
				headers: { accept: "image/webp", "x-forwarded-for": "203.0.113.7" },
			}),
		);

		expect((result as Request).method).toBe("GET");
		expect((result as Request).headers.get("accept")).toBe("image/webp");
		expect((result as Request).headers.get("x-forwarded-for")).toBe(
			"203.0.113.7",
		);
	});

	test("drops a query string someone else added", async () => {
		const result = await rewritten(`${sealedUrl()}?width=99`);

		expect(new URL((result as Request).url).search).toBe("");
	});

	test("rewrites two different seals of one image onto the same path", async () => {
		const handle = handler();
		const first = await rewritten(sealedUrl(), handle);
		const second = await rewritten(sealedUrl(), handle);

		expect(new URL((first as Request).url).pathname).toBe(
			new URL((second as Request).url).pathname,
		);
	});
});

describe("what the edge refuses", () => {
	const refused = async (
		url: string,
		handle?: AssetSealHandler,
	): Promise<Response> => {
		const result = await rewritten(url, handle);
		expect(result).toBeInstanceOf(Response);
		return result as Response;
	};

	test("an expired seal", async () => {
		const url = sealedUrl({ ttl: 60 });
		const response = await refused(url, handler({ nowMs: NOW_MS + 60_000 }));

		expect(response.status).toBe(404);
	});

	test("a seal made with a key the edge does not hold", async () => {
		const response = await refused(sealedUrl({ key: OTHER_KEY, keyId: 7 }));

		expect(response.status).toBe(404);
	});

	test("a tampered blob", async () => {
		const url = sealedUrl();
		const flipped = url.replace(
			/(.)(\.webp)$/,
			(_, last: string, ext: string) => `${"A" === last ? "B" : "A"}${ext}`,
		);
		const response = await refused(flipped);

		expect(response.status).toBe(404);
	});

	test("a path outside the required prefix", async () => {
		const response = await refused(
			sealedUrl({ path: "/elsewhere/a.webp" }),
			handler({ requiredPathPrefix: "/v5_dataset_flat/" }),
		);

		expect(response.status).toBe(404);
	});

	test("noise under the prefix", async () => {
		for (const blob of ["", "x", "not-a-seal", "%20"]) {
			expect((await refused(`${ZONE}/s/${blob}`)).status).toBe(404);
		}
	});

	test("and never lets the refusal be cached", async () => {
		const response = await refused(sealedUrl({ key: OTHER_KEY, keyId: 7 }));

		expect(response.headers.get("cache-control")).toBe("no-store");
	});
});

describe("what the edge leaves alone", () => {
	test("a request that is not under the prefix", async () => {
		const result = await rewritten(`${ZONE}/health`);

		expect(result).toBeInstanceOf(Request);
		expect(new URL((result as Request).url).pathname).toBe("/health");
	});

	test("an already-rewritten request, so running twice is safe", async () => {
		const handle = handler();
		const once = await rewritten(sealedUrl(), handle);
		const twice = await handle(once as Request);

		expect(twice).toBeInstanceOf(Request);
		expect(new URL((twice as Request).url).pathname).toBe(PATH);
	});

	test("a request under a different prefix from the one configured", async () => {
		const result = await rewritten(sealedUrl(), handler({ urlPrefix: "img" }));

		expect(result).toBeInstanceOf(Request);
	});
});

describe("the provider and the edge agree", () => {
	test("what node seals, webcrypto opens", async () => {
		const url = new SealedAssetsResolver({
			key: KEY,
			keyId: KEY_ID,
			now: () => NOW_MS,
		})
			.resolveAsset(`${ZONE}${PATH}`)
			.getURL();

		const result = await rewritten(url);

		expect(new URL((result as Request).url).pathname).toBe(PATH);
	});

	test("end to end, from the env the provider reads", async () => {
		const saved = process.env.PROSOPO_ASSET_SEAL_KEYS;
		process.env.PROSOPO_ASSET_SEAL_KEYS = `${KEY_ID}:${Buffer.from(KEY).toString("base64")}`;
		try {
			const url = getSealedAssetsResolver()
				?.resolveAsset(`${ZONE}${PATH}`)
				.getURL();
			if (!url) throw new Error("expected a resolver");

			const result = await rewritten(url, handler({ nowMs: Date.now() }));

			expect(new URL((result as Request).url).pathname).toBe(PATH);
		} finally {
			if (undefined === saved) {
				Reflect.deleteProperty(process.env, "PROSOPO_ASSET_SEAL_KEYS");
			} else {
				process.env.PROSOPO_ASSET_SEAL_KEYS = saved;
			}
		}
	});
});
