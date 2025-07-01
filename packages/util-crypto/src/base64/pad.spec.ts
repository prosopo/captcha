// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { base64Pad } from "./index.js";

describe("base64Pad", (): void => {
	it("pads a utf-8 string", (): void => {
		expect(base64Pad("YWJjZA")).toEqual("YWJjZA==");
	});
});
