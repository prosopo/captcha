// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS } from "./defaults.js";
import { scryptEncode } from "./index.js";

// biome-ignore lint/suspicious/noExportsInTest: <explanation>
export const KNOWN_TEST = "testing, 123";

// biome-ignore lint/suspicious/noExportsInTest: <explanation>
export const KNOWN_PASS = new Uint8Array([
	223, 185, 241, 135, 125, 17, 195, 27, 64, 64, 154, 69, 47, 82, 123, 38, 255,
	230, 199, 200, 101, 115, 21, 116, 119, 59, 67, 43, 58, 220, 112, 70, 124, 139,
	240, 206, 42, 148, 140, 132, 64, 226, 164, 25, 104, 80, 49, 92, 144, 132, 109,
	178, 76, 225, 171, 116, 151, 181, 34, 243, 177, 235, 134, 76,
]);

// biome-ignore lint/suspicious/noExportsInTest: <explanation>
export const KNOWN_SALT = new Uint8Array([
	1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 6, 7, 8, 1, 2,
	3, 4, 5, 6, 7, 8,
]);

describe("scryptEncode", (): void => {
	for (const onlyJs of [false, true]) {
		describe(`onlyJs=${(onlyJs && "true") || "false"}`, (): void => {
			it("generates a known output", (): void => {
				expect(scryptEncode(KNOWN_TEST, KNOWN_SALT, undefined, onlyJs)).toEqual(
					{
						params: DEFAULT_PARAMS,
						password: KNOWN_PASS,
						salt: KNOWN_SALT,
					},
				);
			});
		});
	}
});
