// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { isBase32 } from "./index.js";

describe("isBase32", (): void => {
	it("validates encoded", (): void => {
		expect(
			isBase32(
				"afkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy",
				false,
			),
		).toEqual(true);
	});

	it("validates ipfs-compat encoded", (): void => {
		expect(
			isBase32(
				"bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy",
				false,
			),
		).toEqual(true);
	});

	it("fails on invalid", (): void => {
		expect(isBase32("not in base32")).toEqual(false);
	});

	it("fails on non-ipfs", (): void => {
		expect(
			isBase32(
				"afkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy",
				true,
			),
		).toEqual(false);
	});
});
