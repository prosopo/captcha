// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { hexToU8a } from "@polkadot/util";
import { describe, expect, it } from "vitest";
import { blake2AsU8a } from "./index.js";

describe("blake2AsU8a", (): void => {
	for (const onlyJs of [false, true]) {
		describe(`onlyJs=${(onlyJs && "true") || "false"}`, (): void => {
			it("returns a 64-bit value by default", (): void => {
				expect(blake2AsU8a("abc", undefined, undefined, onlyJs)).toEqual(
					new Uint8Array([
						189, 221, 129, 60, 99, 66, 57, 114, 49, 113, 239, 63, 238, 152, 87,
						155, 148, 150, 78, 59, 177, 203, 62, 66, 114, 98, 200, 192, 104,
						213, 35, 25,
					]),
				);
			});

			it("returns a 128-bit value (as specified,)", (): void => {
				expect(blake2AsU8a("abc", 128, undefined, onlyJs)).toEqual(
					new Uint8Array([
						207, 74, 183, 145, 198, 43, 141, 43, 33, 9, 201, 2, 117, 40, 120,
						22,
					]),
				);
			});

			it("returns a 256-bit value (as specified)", (): void => {
				expect(blake2AsU8a("abc", 256, undefined, onlyJs)).toEqual(
					new Uint8Array([
						189, 221, 129, 60, 99, 66, 57, 114, 49, 113, 239, 63, 238, 152, 87,
						155, 148, 150, 78, 59, 177, 203, 62, 66, 114, 98, 200, 192, 104,
						213, 35, 25,
					]),
				);
			});

			it("returns a 512-bit value (as specified)", (): void => {
				expect(blake2AsU8a("abc", 512, undefined, onlyJs)).toEqual(
					hexToU8a(
						"0xba80a53f981c4d0d6a2797b69f12f6e94c212f14685ac4b74b12bb6fdbffa2d17d87c5392aab792dc252d5de4533cc9518d38aa8dbf1925ab92386edd4009923",
					),
				);
			});
		});
	}

	it("has equivalent Wasm/Js outputs on hex inputs", (): void => {
		const a = blake2AsU8a("0x123456", 256, null, false);
		const b = blake2AsU8a("0x123456", 256, null, true);

		expect(a).toEqual(b);
	});

	it("has equivalent Wasm/Js outputs with key inputs", (): void => {
		const a = blake2AsU8a("0x123456", 256, new Uint8Array([1, 2]), false);
		const b = blake2AsU8a("0x123456", 256, new Uint8Array([1, 2]), true);

		expect(a).toEqual(b);
	});
});
