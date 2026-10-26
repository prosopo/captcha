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
import {
	sealAssetPath,
	unsealAssetPath,
} from "../../../../api/captcha/assetSeal.js";
import {
	SEAL_KEY_BYTES,
	decodeEnvelope,
	encodeEnvelope,
	isSafeAssetPath,
	parseSealKeys,
	toBase64Url,
} from "../../../../api/captcha/assetSealFormat.js";

const KEY = new Uint8Array(SEAL_KEY_BYTES).fill(7);
const OTHER_KEY = new Uint8Array(SEAL_KEY_BYTES).fill(9);
const KEY_ID = 1;
const NOW_SECONDS = 1_700_000_000;
const PATH = "/v5_dataset_flat/images/abc.webp";

const keys = (
	entries: [number, Uint8Array][] = [[KEY_ID, KEY]],
): Map<number, Uint8Array> => new Map(entries);

const seal = (
	overrides: {
		path?: string;
		keyId?: number;
		key?: Uint8Array;
		ttl?: number;
	} = {},
): string =>
	sealAssetPath({
		path: overrides.path ?? PATH,
		key: overrides.key ?? KEY,
		keyId: overrides.keyId ?? KEY_ID,
		expiresAtSeconds: NOW_SECONDS + (overrides.ttl ?? 300),
	});

const unseal = (
	blob: string,
	overrides: {
		keys?: Map<number, Uint8Array>;
		nowSeconds?: number;
		requiredPathPrefix?: string;
	} = {},
): string | undefined =>
	unsealAssetPath({
		blob,
		keys: overrides.keys ?? keys(),
		nowSeconds: overrides.nowSeconds ?? NOW_SECONDS,
		...(overrides.requiredPathPrefix !== undefined
			? { requiredPathPrefix: overrides.requiredPathPrefix }
			: {}),
	});

describe("sealing a path", () => {
	test("opens again to the path it was given", () => {
		expect(unseal(seal())).toBe(PATH);
	});

	test("says nothing about the path it carries", () => {
		const blob = seal();
		expect(blob).not.toContain("abc");
		expect(blob).not.toContain("images");
		expect(blob).not.toContain("v5_dataset_flat");
	});

	test("is different every time, for the same path", () => {
		const blobs = new Set(Array.from({ length: 50 }, () => seal()));
		expect(blobs.size).toBe(50);
	});

	test("is usable in a URL path segment", () => {
		expect(seal()).toMatch(/^[A-Za-z0-9_-]+$/);
	});

	test("refuses to seal a path that could not be served", () => {
		expect(() => seal({ path: "../../etc/passwd" })).toThrow();
		expect(() => seal({ path: "no-leading-slash" })).toThrow();
	});
});

describe("opening a seal", () => {
	test("rejects one whose expiry has passed", () => {
		const blob = seal({ ttl: 60 });
		expect(unseal(blob, { nowSeconds: NOW_SECONDS + 59 })).toBe(PATH);
		expect(unseal(blob, { nowSeconds: NOW_SECONDS + 60 })).toBeUndefined();
		expect(unseal(blob, { nowSeconds: NOW_SECONDS + 61 })).toBeUndefined();
	});

	test("rejects one sealed under a key we do not hold", () => {
		const blob = seal({ key: OTHER_KEY, keyId: 2 });
		expect(unseal(blob)).toBeUndefined();
	});

	test("rejects one whose key id has been swapped", () => {
		const envelope = decodeEnvelope(seal());
		if (!envelope) throw new Error("expected an envelope");
		const swapped = encodeEnvelope({ ...envelope, keyId: 2 });

		expect(
			unseal(swapped, {
				keys: keys([
					[KEY_ID, KEY],
					[2, KEY],
				]),
			}),
		).toBeUndefined();
	});

	test("rejects a tampered blob", () => {
		const blob = seal();
		const flipped = `${blob.slice(0, -2)}${"A" === blob.slice(-2, -1) ? "B" : "A"}${blob.slice(-1)}`;
		expect(unseal(flipped)).toBeUndefined();
	});

	test("rejects truncation", () => {
		expect(unseal(seal().slice(0, 20))).toBeUndefined();
	});

	test("rejects noise", () => {
		for (const blob of ["", "!!!!", "a", toBase64Url(new Uint8Array(8))]) {
			expect(unseal(blob)).toBeUndefined();
		}
	});

	test("enforces the path prefix when one is required", () => {
		expect(unseal(seal(), { requiredPathPrefix: "/v5_dataset_flat/" })).toBe(
			PATH,
		);
		expect(
			unseal(seal({ path: "/elsewhere/a.webp" }), {
				requiredPathPrefix: "/v5_dataset_flat/",
			}),
		).toBeUndefined();
	});

	test("opens a blob sealed under any key still configured", () => {
		const old = seal({ key: KEY, keyId: 1 });
		const fresh = seal({ key: OTHER_KEY, keyId: 2 });
		const both = keys([
			[1, KEY],
			[2, OTHER_KEY],
		]);

		expect(unseal(old, { keys: both })).toBe(PATH);
		expect(unseal(fresh, { keys: both })).toBe(PATH);
	});
});

describe("isSafeAssetPath", () => {
	test("accepts an ordinary dataset path", () => {
		expect(isSafeAssetPath(PATH)).toBe(true);
	});

	test("rejects traversal, protocol-relative paths and control characters", () => {
		expect(isSafeAssetPath("/a/../b.webp")).toBe(false);
		expect(isSafeAssetPath("//evil.example/a.webp")).toBe(false);
		expect(isSafeAssetPath("/a\nHost: evil.example")).toBe(false);
		expect(isSafeAssetPath("relative.webp")).toBe(false);
	});

	test("rejects a path longer than any real item", () => {
		expect(isSafeAssetPath(`/${"a".repeat(512)}`)).toBe(false);
	});
});

describe("parseSealKeys", () => {
	const encoded = toBase64Url(KEY);

	test("reads id and key pairs", () => {
		const parsed = parseSealKeys(`1:${encoded},2:${toBase64Url(OTHER_KEY)}`);
		expect(Array.from(parsed.keys()).sort()).toEqual([1, 2]);
		expect(parsed.get(1)).toEqual(KEY);
	});

	test("tolerates whitespace and trailing separators", () => {
		expect(parseSealKeys(` 1:${encoded} , `).size).toBe(1);
	});

	test("refuses a key that is not 32 bytes", () => {
		expect(() => parseSealKeys(`1:${toBase64Url(new Uint8Array(16))}`)).toThrow(
			/32/,
		);
	});

	test("refuses malformed entries", () => {
		expect(() => parseSealKeys(encoded)).toThrow(/keyId:base64key/);
		expect(() => parseSealKeys(`x:${encoded}`)).toThrow(/integer/);
		expect(() => parseSealKeys("")).toThrow(/No seal keys/);
	});
});
