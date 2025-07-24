// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { hexToU8a } from "@polkadot/util";
import { describe, expect, it } from "vitest";
import { blake2AsHex } from "./index.js";

describe("blake2AsHex", (): void => {
	for (const onlyJs of [false, true]) {
		describe(`onlyJs=${(onlyJs && "true") || "false"}`, (): void => {
			it("returns a 64-bit value (specified)", (): void => {
				expect(blake2AsHex("abc", 64, null, onlyJs)).toEqual(
					"0xd8bb14d833d59559",
				);
			});

			it("returns a 128-bit value (as specified)", (): void => {
				expect(blake2AsHex("abc", 128, null, onlyJs)).toEqual(
					"0xcf4ab791c62b8d2b2109c90275287816",
				);
			});

			it("returns a 128-bit value (as specified, with key)", (): void => {
				expect(blake2AsHex("abc", 128, new Uint8Array([1, 2]), onlyJs)).toEqual(
					"0x36f3d08cda72a00ddf2be103eb5770d9",
				);
			});

			it("returns a 256-bit value (default)", (): void => {
				expect(blake2AsHex("abc", undefined, null, onlyJs)).toEqual(
					"0xbddd813c634239723171ef3fee98579b94964e3bb1cb3e427262c8c068d52319",
				);
			});

			it("returns a 512-bit value (as specified)", (): void => {
				expect(blake2AsHex("abc", 512, null, onlyJs)).toEqual(
					"0xba80a53f981c4d0d6a2797b69f12f6e94c212f14685ac4b74b12bb6fdbffa2d17d87c5392aab792dc252d5de4533cc9518d38aa8dbf1925ab92386edd4009923",
				);
			});

			it("matches with the Rust implementation", (): void => {
				expect(
					blake2AsHex(
						hexToU8a(
							"0x454545454545454545454545454545454545454545454545454545454545454501000000000000002481853da20b9f4322f34650fea5f240dcbfb266d02db94bfa0153c31f4a29dbdbf025dd4a69a6f4ee6e1577b251b655097e298b692cb34c18d3182cac3de0dc00000000",
						),
						256,
						undefined,
						onlyJs,
					),
				).toEqual(
					"0x1025e5db74fdaf4d2818822dccf0e1604ae9ccc62f26cecfde23448ff0248abf",
				);
			});
		});
	}
});
