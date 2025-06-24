// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { base32Decode } from "../base32/index.js";
import { base58Encode } from "./index.js";

describe("base58Encode", (): void => {
	it("encodes a base32 to a base58", (): void => {
		expect(
			base58Encode(
				base32Decode(
					"bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy",
					true,
				),
			),
		).toEqual("b2rhk6GMPQF3hfzwXTaNYFLKomMeC6UXdUt6jZKPpeVirLtV");
	});

	it("encodes a base32 to a base58 (ipfs-compat)", (): void => {
		expect(
			base58Encode(
				base32Decode(
					"bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy",
					true,
				),
				true,
			),
		).toEqual("zb2rhk6GMPQF3hfzwXTaNYFLKomMeC6UXdUt6jZKPpeVirLtV");
	});
});
