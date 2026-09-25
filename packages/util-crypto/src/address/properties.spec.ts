// Copyright 2021-2026 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { decodeAddress, encodeAddress } from "./index.js";

const ss58Format = fc
	.integer({ min: 0, max: 16383 })
	.filter((f) => f !== 46 && f !== 47);

const base58 = fc
	.array(
		fc.constantFrom(
			..."123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",
		),
		{ minLength: 1, maxLength: 60 },
	)
	.map((chars) => chars.join(""));

describe("address encode / decode", () => {
	it("decodeAddress inverts encodeAddress for any 32-byte key and prefix", () => {
		fc.assert(
			fc.property(
				fc.uint8Array({ minLength: 32, maxLength: 32 }),
				ss58Format,
				(key, format) => {
					const address = encodeAddress(key, format);
					expect(decodeAddress(address)).toEqual(key);
					expect(decodeAddress(address, false, format)).toEqual(key);
				},
			),
		);
	});

	it("decodeAddress rejects a wrong expected prefix", () => {
		fc.assert(
			fc.property(
				fc.uint8Array({ minLength: 32, maxLength: 32 }),
				ss58Format,
				ss58Format,
				(key, format, other) => {
					fc.pre(format !== other);
					expect(() =>
						decodeAddress(encodeAddress(key, format), false, other),
					).toThrow(/Expected ss58Format/);
				},
			),
		);
	});

	it("decodeAddress throws only Errors on arbitrary base58", () => {
		fc.assert(
			fc.property(base58, fc.boolean(), (input, ignoreChecksum) => {
				try {
					decodeAddress(input, ignoreChecksum);
				} catch (e) {
					expect(e).toBeInstanceOf(Error);
				}
			}),
		);
	});
});
