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

import fc from "fast-check";
import { describe, expect, test } from "vitest";
import {
	sealAssetPath,
	unsealAssetPath,
} from "../../../../api/captcha/assetSeal.js";
import {
	IV_BYTES,
	SEAL_KEY_BYTES,
	decodeEnvelope,
	decodePayload,
	encodeEnvelope,
	encodePayload,
	fromBase64Url,
	isSafeAssetPath,
	parseSealKeys,
	toBase64Url,
} from "../../../../api/captcha/assetSealFormat.js";

const keyId = fc.integer({ min: 0, max: 255 });
const key = fc.uint8Array({
	minLength: SEAL_KEY_BYTES,
	maxLength: SEAL_KEY_BYTES,
});
const expiry = fc.integer({ min: 0, max: 2 ** 32 - 1 });
const segment = fc
	.stringMatching(/^[A-Za-z0-9_.-]{1,20}$/)
	.filter((s) => !s.includes(".."));
const assetPath = fc
	.array(segment, { minLength: 1, maxLength: 6 })
	.map((segments) => `/${segments.join("/")}`);

describe("asset seal format", () => {
	test("base64url round-trips any bytes", () => {
		fc.assert(
			fc.property(fc.uint8Array({ minLength: 1 }), (bytes) => {
				expect(fromBase64Url(toBase64Url(bytes))).toEqual(bytes);
			}),
		);
	});

	test("envelope decode inverts encode", () => {
		fc.assert(
			fc.property(
				keyId,
				fc.uint8Array({ minLength: IV_BYTES, maxLength: IV_BYTES }),
				fc.uint8Array({ minLength: 1 }),
				(id, iv, sealed) => {
					expect(
						decodeEnvelope(encodeEnvelope({ keyId: id, iv, sealed })),
					).toEqual({
						keyId: id,
						iv,
						sealed,
					});
				},
			),
		);
	});

	test("payload decode inverts encode", () => {
		fc.assert(
			fc.property(
				expiry,
				fc.string({ unit: "grapheme", minLength: 1 }),
				(expiresAtSeconds, path) => {
					expect(
						decodePayload(encodePayload({ expiresAtSeconds, path })),
					).toEqual({
						expiresAtSeconds,
						path,
					});
				},
			),
		);
	});

	test("decoders return undefined rather than throw on arbitrary input", () => {
		fc.assert(
			fc.property(fc.string(), fc.uint8Array(), (blob, bytes) => {
				decodeEnvelope(blob);
				decodePayload(bytes);
				fromBase64Url(blob);
			}),
		);
	});

	test("parseSealKeys reads back every configured key", () => {
		fc.assert(
			fc.property(
				fc.uniqueArray(fc.tuple(keyId, key), {
					minLength: 1,
					selector: ([id]) => id,
				}),
				(entries) => {
					const spec = entries
						.map(
							([id, bytes]) => `${id}:${Buffer.from(bytes).toString("base64")}`,
						)
						.join(",");
					expect(parseSealKeys(spec)).toEqual(new Map(entries));
				},
			),
		);
	});

	test("parseSealKeys throws only Errors on arbitrary specs", () => {
		fc.assert(
			fc.property(fc.string(), (spec) => {
				try {
					parseSealKeys(spec);
				} catch (e) {
					expect(e).toBeInstanceOf(Error);
				}
			}),
		);
	});

	test("isSafeAssetPath rejects traversal and control characters", () => {
		fc.assert(
			fc.property(fc.string(), (path) => {
				if (!isSafeAssetPath(path)) return;
				expect(path.startsWith("/")).toBe(true);
				expect(path).not.toContain("..");
				expect(path).not.toContain("//");
				for (const char of path) {
					const code = char.charCodeAt(0);
					expect(code > 0x1f && code !== 0x7f).toBe(true);
				}
			}),
		);
	});
});

describe("asset seal", () => {
	test("unseal returns the sealed path before expiry and nothing after", () => {
		fc.assert(
			fc.property(
				assetPath,
				keyId,
				key,
				fc.integer({ min: 1, max: 2 ** 31 }),
				fc.integer({ min: 1, max: 10_000 }),
				(path, id, secret, expiresAtSeconds, late) => {
					const blob = sealAssetPath({
						path,
						key: secret,
						keyId: id,
						expiresAtSeconds,
					});
					const keys = new Map([[id, secret]]);
					expect(
						unsealAssetPath({ blob, keys, nowSeconds: expiresAtSeconds - 1 }),
					).toBe(path);
					expect(
						unsealAssetPath({
							blob,
							keys,
							nowSeconds: expiresAtSeconds + late,
						}),
					).toBeUndefined();
				},
			),
			{ numRuns: 50 },
		);
	});

	test("unseal never throws and never accepts a tampered blob", () => {
		fc.assert(
			fc.property(
				assetPath,
				key,
				fc.nat(),
				fc.integer({ min: 1, max: 255 }),
				(path, secret, index, flip) => {
					const blob = sealAssetPath({
						path,
						key: secret,
						keyId: 1,
						expiresAtSeconds: 2 ** 31,
					});
					const bytes = fromBase64Url(blob);
					if (!bytes)
						throw new Error("sealAssetPath produced invalid base64url");
					const at = index % bytes.length;
					bytes[at] = (bytes[at] ?? 0) ^ flip;
					expect(
						unsealAssetPath({
							blob: toBase64Url(bytes),
							keys: new Map([[1, secret]]),
							nowSeconds: 0,
						}),
					).toBeUndefined();
				},
			),
			{ numRuns: 50 },
		);
	});
});
