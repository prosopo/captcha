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

import { describe, expect, it } from "vitest";
import {
	DecodeError,
	decodeBase64,
	decodeBase64Url,
	decodeHex,
} from "../decode.js";

describe("decodeBase64", () => {
	it.each([
		["aGVsbG8=", "hello"],
		["aGVsbG8", "hello"],
		["aGk=", "hi"],
		["", ""],
	])("decodes %j", (input, expected) => {
		expect(decodeBase64(input).unwrap().toString()).toBe(expected);
	});

	it.each(["a", "aGVsbG8=x", "aGV$bG8=", "a b=", "aGVsbG8==", "====", "a-_="])(
		"rejects %j",
		(input) => {
			const error = decodeBase64(input).unwrapErr();
			expect(error).toBeInstanceOf(DecodeError);
			expect(error.encoding).toBe("base64");
		},
	);

	it("does not put the input in the error", () => {
		expect(decodeBase64("secret!").unwrapErr().message).not.toContain("secret");
	});
});

describe("decodeBase64Url", () => {
	it("decodes the url alphabet", () => {
		expect(decodeBase64Url("-_8").unwrap()).toEqual(Buffer.from([0xfb, 0xff]));
	});

	it("rejects the standard alphabet", () => {
		expect(decodeBase64Url("+/8=").ok).toBe(false);
	});
});

describe("decodeHex", () => {
	it("decodes either case", () => {
		expect(decodeHex("00fF").unwrap()).toEqual(Buffer.from([0, 255]));
	});

	it.each(["0", "0g", "abc", "0x00"])("rejects %j", (input) => {
		expect(decodeHex(input).unwrapErr().encoding).toBe("hex");
	});
});
