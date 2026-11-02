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

import { decodeOpenPayload } from "@prosopo/provider";
import {
	OPEN_DETECTOR_FORMAT,
	type OpenDetectorPayload,
	ReplaceDetectorPoolBody,
} from "@prosopo/types";
import { describe, expect, it } from "vitest";
import { buildPool } from "../pool.js";
import { PUBLIC_KEY_PLACEHOLDER } from "../publicKey.js";
import { sealPayload } from "../seal.js";

const detectorJs = `const k="${PUBLIC_KEY_PLACEHOLDER}";export default k;`;

const inlinedPublicKey = (js: string): string => {
	const match = /const k="([^"]+)"/.exec(js);
	if (!match?.[1]) throw new Error("no public key in bundle");
	return match[1];
};

const payload: OpenDetectorPayload = {
	score: 0,
	timestamp: 1_790_000_000_000,
	userId: "5UserAccount",
	userAgent: "0123456789abcdef0123456789abcdef",
	headHash: "head-hash",
	d: { bot: false },
};

describe("buildPool", () => {
	it("gives every bundle its own keypair", () => {
		const bundles = buildPool(detectorJs, 3);
		const keys = Object.values(bundles).map((bundle) =>
			inlinedPublicKey(bundle.js),
		);

		expect(Object.keys(bundles)).toEqual(["bundle-0", "bundle-1", "bundle-2"]);
		expect(new Set(keys).size).toBe(3);
		for (const bundle of Object.values(bundles)) {
			expect(bundle.format).toBe(OPEN_DETECTOR_FORMAT);
			expect(bundle.js).not.toContain(PUBLIC_KEY_PLACEHOLDER);
		}
	});

	it("produces a pool the provider's push schema accepts unchanged", () => {
		const body = { bundles: buildPool(detectorJs, 1) };

		expect(ReplaceDetectorPoolBody.parse(body)).toEqual(body);
	});

	it("refuses a bundle without exactly one placeholder", () => {
		expect(() => buildPool("export default 1;", 1)).toThrow();
		expect(() =>
			buildPool(`${PUBLIC_KEY_PLACEHOLDER}${PUBLIC_KEY_PLACEHOLDER}`, 1),
		).toThrow();
	});
});

describe("sealPayload", () => {
	it("produces a token the provider decodes with the bundle's private key", async () => {
		const bundle = buildPool(detectorJs, 1)["bundle-0"];
		if (!bundle) throw new Error("no bundle built");

		const token = await sealPayload(payload, inlinedPublicKey(bundle.js));

		expect(decodeOpenPayload(token, "head-hash", bundle.privateKey)).toEqual({
			baseBotScore: 0,
			timestamp: 1_790_000_000_000,
			userId: "5UserAccount",
			userAgent: "0123456789abcdef0123456789abcdef",
			isWebView: false,
			isIframe: false,
			decryptedHeadHash: "head-hash",
			d: { bot: false },
		});
	});

	it("cannot be read with another bundle's key", async () => {
		const bundles = buildPool(detectorJs, 2);
		const [first, second] = [bundles["bundle-0"], bundles["bundle-1"]];
		if (!first || !second) throw new Error("no bundles built");

		const token = await sealPayload(payload, inlinedPublicKey(first.js));

		expect(() =>
			decodeOpenPayload(token, "head-hash", second.privateKey),
		).toThrow();
	});
});
