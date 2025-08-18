// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { u8aEq, u8aToHex } from "@polkadot/util";
import { describe, expect, it } from "vitest";
import { randomAsU8a } from "../random/asU8a.js";
import { pbkdf2Encode } from "./index.js";

const KNOWN_SALT = new Uint8Array([
	1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
	23, 24, 25, 26, 27, 28, 29, 30, 31, 32,
]);
const TEST_PASSWORD = "test password";

describe("pbkdf2Encode", (): void => {
	for (const rounds of [256, 1024, 2048] as const) {
		it(`has equivalent Wasm & JS results (${rounds} rounds)`, (): void => {
			const salt = randomAsU8a();

			expect(
				u8aEq(
					pbkdf2Encode(TEST_PASSWORD, salt, rounds, false).password,
					pbkdf2Encode(TEST_PASSWORD, salt, rounds, true).password,
				),
			).toBe(true);
		});
	}

	for (const onlyJs of [false, true]) {
		describe(`onlyJs=${(onlyJs && "true") || "false"}`, (): void => {
			it("creates known iterations", (): void => {
				expect(
					u8aToHex(
						pbkdf2Encode(TEST_PASSWORD, KNOWN_SALT, 2048, onlyJs).password,
					),
				).toEqual(
					"0x600ba9ad65e4294d112e028fdad5dd8fce0a6a6e6b89fb36ed006785ccc3b3aec46831b3105c24237293e6cfa1a0ef6717c113f87ff9237a3f73d210adfa6634",
				);
			});
		});
	}
});
