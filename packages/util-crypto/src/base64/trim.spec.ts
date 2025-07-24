// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { base64Trim } from "./index.js";

describe("base64Trim", (): void => {
	it("trims a utf-8 string", (): void => {
		expect(
			base64Trim(
				"aGVsbG8gd29ybGQg0J/RgNC40LLQtdGC0YHRgtCy0YPRjiDQvNC4IOS9oOWlvQ==",
			),
		).toEqual("aGVsbG8gd29ybGQg0J/RgNC40LLQtdGC0YHRgtCy0YPRjiDQvNC4IOS9oOWlvQ");
	});
});
