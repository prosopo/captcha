// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { base32Decode } from "../base32/index.js";
import { base58Decode } from "./index.js";

describe("base58Encode", (): void => {
	it("decodes an empty string)", (): void => {
		expect(base58Decode("")).toEqual(new Uint8Array());
	});

	it("encodes a base58 to a base32", (): void => {
		expect(
			base58Decode("b2rhk6GMPQF3hfzwXTaNYFLKomMeC6UXdUt6jZKPpeVirLtV"),
		).toEqual(
			base32Decode(
				"afkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy",
			),
		);
	});

	it("encodes a base58 to a base32 (ipfs-compat)", (): void => {
		expect(
			base58Decode("zb2rhk6GMPQF3hfzwXTaNYFLKomMeC6UXdUt6jZKPpeVirLtV", true),
		).toEqual(
			base32Decode(
				"bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy",
				true,
			),
		);
	});
});
