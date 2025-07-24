// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { base58Decode } from "../base58/index.js";
import { base32Encode } from "./index.js";

describe("base32Encode", (): void => {
	it("encodes to a base32", (): void => {
		expect(base32Encode("Decentralize everything!!")).toEqual(
			"irswgzloorzgc3djpjssazlwmvzhs5dinfxgoijb",
		);
	});

	it("encodes to a base32 (ipfs-compat)", (): void => {
		expect(base32Encode("Decentralize everything!!", true)).toEqual(
			"birswgzloorzgc3djpjssazlwmvzhs5dinfxgoijb",
		);
	});

	it("encodes a base58 to a base32", (): void => {
		expect(
			base32Encode(
				base58Decode("zb2rhk6GMPQF3hfzwXTaNYFLKomMeC6UXdUt6jZKPpeVirLtV", true),
				true,
			),
		).toEqual("bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy");
	});
});
