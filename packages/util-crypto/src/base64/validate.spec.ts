// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { base64Validate } from "./index.js";

describe("base64Validate", (): void => {
	it("validates a mixed base64 utf8 string", (): void => {
		expect(() =>
			base64Validate(
				"aGVsbG8gd29ybGQg0J/RgNC40LLQtd^GC0YHRgtCy0YPRjiDQvNC4IOS9oOWlvQ==",
			),
		).toThrow(/Invalid base64 character "\^" \(0x5e\) at index 30/);
	});

	it("validates with one extra padding character", (): void => {
		expect(base64Validate("bGlnaHQgd28=")).toEqual(true);
	});

	it("validates with two extra padding characters", (): void => {
		expect(base64Validate("bGlnaHQgdw==")).toEqual(true);
	});

	it("validates misplaced padding characters", (): void => {
		expect(() => base64Validate("bGlnaHQgdw=g=")).toThrow(
			/Invalid base64 padding sequence "=g"/,
		);
	});
});
