// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { stringToU8a } from "@polkadot/util";
import { describe, expect, it } from "vitest";
import { base64Decode } from "./index.js";

describe("base64Decode", (): void => {
	it("decodes an empty string)", (): void => {
		expect(base64Decode("")).toEqual(stringToU8a(""));
	});

	it("decodes a mixed base64 utf8 string (1)", (): void => {
		expect(
			base64Decode(
				"aGVsbG8gd29ybGQg0J/RgNC40LLQtdGC0YHRgtCy0YPRjiDQvNC4IOS9oOWlvQ==",
			),
		).toEqual(stringToU8a("hello world Приветствую ми 你好"));
	});

	it("decodes a mixed base64 utf8 string (2)", (): void => {
		expect(base64Decode("4pyTIMOgIGxhIG1vZGU=")).toEqual(
			stringToU8a("✓ à la mode"),
		);
	});

	it("decodes a mixed base64 utf8 string (3)", (): void => {
		expect(base64Decode("SGVsbG8gV29ybGQh")).toEqual(
			stringToU8a("Hello World!"),
		);
	});
});
