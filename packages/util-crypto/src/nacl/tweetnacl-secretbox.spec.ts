// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

// Adapted from https://github.com/dchest/tweetnacl-js/blob/6a9594a35a27f9c723c5f1c107e376d1c65c23b3/test/04-secretbox.quick.js
// Adapted from https://github.com/dchest/tweetnacl-js/blob/6a9594a35a27f9c723c5f1c107e376d1c65c23b3/test/04-secretbox.js
//
// Changes made:
//  - Jest-like test environment (not tape)
//  - Combine "quick" and "random" tests into single file
//
// Original headers:
//
// Ported in 2014 by Dmitry Chestnykh and Devi Mandiri.
// Public domain.
//
// Implementation derived from TweetNaCl version 20140427.
// See for details: http://tweetnacl.cr.yp.to/

import { stringToU8a, u8aEq } from "@polkadot/util";

import { base64Decode } from "../base64/index.js";
import { TEST_DATA } from "./tweetnacl-secretbox-data.spec.js";
import { naclSecretbox, naclSecretboxOpen } from "./tweetnacl.js";

describe("tweetnacl/secretbox", (): void => {
	describe("tweetnacl/test/04-secretbox.quick.js", (): void => {
		it("naclSecretbox and naclSecretboxOpen", (): void => {
			const key = new Uint8Array(32);
			const nonce = new Uint8Array(24);

			for (let i = 0; i < key.length; i++) {
				key[i] = i & 0xff;
			}

			for (let i = 0; i < nonce.length; i++) {
				nonce[i] = (32 + i) & 0xff;
			}

			const msg = stringToU8a("message to encrypt");
			const box = naclSecretbox(msg, nonce, key);
			const openedMsg = naclSecretboxOpen(box, nonce, key);

			expect(!!openedMsg && u8aEq(openedMsg, msg)).toEqual(true);
		});

		it("naclSecretbox.open with invalid box", (): void => {
			const key = new Uint8Array(32);
			const nonce = new Uint8Array(24);

			expect(naclSecretboxOpen(new Uint8Array(0), nonce, key)).toBe(null);

			expect(naclSecretboxOpen(new Uint8Array(10), nonce, key)).toBe(null);

			expect(naclSecretboxOpen(new Uint8Array(100), nonce, key)).toBe(null);
		});

		it("naclSecretbox.open with invalid nonce", (): void => {
			const key = new Uint8Array(32);
			const nonce = new Uint8Array(24);

			for (let i = 0; i < nonce.length; i++) {
				nonce[i] = i & 0xff;
			}

			const msg = stringToU8a("message to encrypt");
			const box = naclSecretbox(msg, nonce, key);
			const unbox = naclSecretboxOpen(box, nonce, key);

			expect(!!unbox && u8aEq(unbox, msg)).toBe(true);

			nonce[0] = 255;

			expect(naclSecretboxOpen(box, nonce, key)).toBe(null);
		});

		it("naclSecretbox.open with invalid key", (): void => {
			const key = new Uint8Array(32);

			for (let i = 0; i < key.length; i++) {
				key[i] = i & 0xff;
			}

			const nonce = new Uint8Array(24);
			const msg = stringToU8a("message to encrypt");
			const box = naclSecretbox(msg, nonce, key);
			const unbox = naclSecretboxOpen(box, nonce, key);

			expect(!!unbox && u8aEq(unbox, msg)).toBe(true);

			key[0] = 255;

			expect(naclSecretboxOpen(box, nonce, key)).toBe(null);
		});

		it("naclSecretbox with message lengths of 0 to 1024", (): void => {
			const key = new Uint8Array(32);
			const nonce = new Uint8Array(24);
			const fullMsg = new Uint8Array(1024);

			for (let i = 0; i < key.length; i++) {
				key[i] = i & 0xff;
			}

			for (let i = 0; i < fullMsg.length; i++) {
				fullMsg[i] = i & 0xff;
			}

			for (let i = 0; i < fullMsg.length; i++) {
				const msg = fullMsg.subarray(0, i);
				const box = naclSecretbox(msg, nonce, key);
				const unbox = naclSecretboxOpen(box, nonce, key);

				expect(!!unbox && u8aEq(unbox, msg)).toBe(true);
			}
		});
	});

	describe("tweetnacl/test/04-secretbox.js", (): void => {
		for (let i = 0, count = TEST_DATA.length; i < count; i++) {
			// @ts-ignore
			const [keyBase64, nonceBase64, msgBase64, expBase64] = TEST_DATA[i];

			it(`is ok on "${msgBase64}"`, (): void => {
				const key = base64Decode(keyBase64);
				const nonce = base64Decode(nonceBase64);
				const msg = base64Decode(msgBase64);
				const goodBox = base64Decode(expBase64);
				const box = naclSecretbox(msg, nonce, key);

				expect(u8aEq(box, goodBox)).toBe(true);

				const unbox = naclSecretboxOpen(goodBox, nonce, key);

				expect(!!unbox && u8aEq(unbox, msg)).toBe(true);
			});
		}
	});
});
