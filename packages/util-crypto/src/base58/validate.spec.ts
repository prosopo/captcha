// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { base58Validate } from "./index.js";

describe("base58Validate", (): void => {
	it("validates encoded", (): void => {
		expect(
			base58Validate("a1UbyspTdnyZXLUQaQbciCxrCWWxz24kgSwGXSQnkbs", false),
		).toEqual(true);
	});

	it("fails on string with extra padding", (): void => {
		expect(() =>
			base58Validate("a1UbyspTdnyZXLUQaQbciCxrCWWxz24kgSwGXSQnkbs=", false),
		).toThrow(/Invalid base58 character "="/);
	});
});
