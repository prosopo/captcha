// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import { stringToU8a, u8aToString } from "@polkadot/util";
import { describe, expect, expectTypeOf, it } from "vitest";
import {
	base64Decode,
	base64Encode,
	base64URLDecode,
	base64URLEncode,
} from "./bs64.js";

describe("base64URLEncode", (): void => {
	it("encodes Uint8Array to base64url string", (): void => {
		const input = stringToU8a("Hello World");
		const result = base64URLEncode(input);
		expect(result).toBe("SGVsbG8gV29ybGQ");
		expect(result).not.toContain("=");
		expect(result).not.toContain("+");
		expect(result).not.toContain("/");
	});

	it("encodes string to base64url string", (): void => {
		const result = base64URLEncode("Hello World");
		expect(result).toBe("SGVsbG8gV29ybGQ");
		expect(result).not.toContain("=");
		expect(result).not.toContain("+");
		expect(result).not.toContain("/");
	});

	it("replaces + with -", (): void => {
		// Use data that produces + in base64 encoding
		const input = new Uint8Array([0xfb, 0xef, 0xbe]);
		const base64 = base64Encode(input);
		const base64url = base64URLEncode(input);
		expect(base64).toContain("+");
		expect(base64url).not.toContain("+");
		expect(base64url).toContain("-");
	});

	it("replaces / with _", (): void => {
		const input = new Uint8Array([0xff, 0xfe, 0xfd]);
		const base64 = base64Encode(input);
		const base64url = base64URLEncode(input);
		expect(base64).toContain("/");
		expect(base64url).not.toContain("/");
		expect(base64url).toContain("_");
	});

	it("removes padding characters", (): void => {
		const input = stringToU8a("test");
		const base64 = base64Encode(input);
		const base64url = base64URLEncode(input);
		expect(base64).toContain("=");
		expect(base64url).not.toContain("=");
	});

	it("produces different output than base64Encode", (): void => {
		const input = stringToU8a("Hello+World/Test");
		const base64 = base64Encode(input);
		const base64url = base64URLEncode(input);
		expect(base64url).not.toEqual(base64);
	});

	it("handles empty input", (): void => {
		const result = base64URLEncode("");
		expect(result).toBe("");
	});

	it("handles binary data", (): void => {
		const input = new Uint8Array([0x00, 0x01, 0x02, 0xff, 0xfe, 0xfd]);
		const result = base64URLEncode(input);
		expect(result).toBeTruthy();
		expect(result.length).toBeGreaterThan(0);
		expect(result).not.toContain("=");
		expect(result).not.toContain("+");
		expect(result).not.toContain("/");
	});
});

describe("base64URLDecode", (): void => {
	it("decodes base64url string to Uint8Array", (): void => {
		const input = "SGVsbG8gV29ybGQ";
		const result = base64URLDecode(input);
		expect(result).toBeInstanceOf(Uint8Array);
		expect(u8aToString(result)).toBe("Hello World");
	});

	it("handles base64url with - character", (): void => {
		const input = "dGVzdC1kYXRh";
		const result = base64URLDecode(input);
		expect(result).toBeInstanceOf(Uint8Array);
		expect(u8aToString(result)).toBe("test-data");
	});

	it("handles base64url with _ character", (): void => {
		const input = "dGVzdF9kYXRh";
		const result = base64URLDecode(input);
		expect(result).toBeInstanceOf(Uint8Array);
		expect(u8aToString(result)).toBe("test_data");
	});

	it("handles base64url without padding", (): void => {
		const input = "SGVsbG8";
		const result = base64URLDecode(input);
		expect(result).toBeInstanceOf(Uint8Array);
		expect(u8aToString(result)).toBe("Hello");
	});

	it("round-trips with base64URLEncode", (): void => {
		const original = stringToU8a("Hello World!");
		const encoded = base64URLEncode(original);
		const decoded = base64URLDecode(encoded);
		expect(decoded).toEqual(original);
	});

	it("round-trips with string input", (): void => {
		const original = "Test String 123";
		const encoded = base64URLEncode(original);
		const decoded = base64URLDecode(encoded);
		expect(u8aToString(decoded)).toBe(original);
	});

	it("handles empty string", (): void => {
		const result = base64URLDecode("");
		expect(result).toBeInstanceOf(Uint8Array);
		expect(result.length).toBe(0);
	});

	it("handles binary data round-trip", (): void => {
		const original = new Uint8Array([0x00, 0x01, 0x02, 0xff, 0xfe, 0xfd]);
		const encoded = base64URLEncode(original);
		const decoded = base64URLDecode(encoded);
		expect(decoded).toEqual(original);
	});

	it("handles base64url with mixed special characters", (): void => {
		const input = "dGVzdC1kYXRhX3Rlc3Q";
		const result = base64URLDecode(input);
		expect(result).toBeInstanceOf(Uint8Array);
		expect(result.length).toBeGreaterThan(0);
	});

	it("decodes same data as base64Decode after conversion", (): void => {
		const data = stringToU8a("test data");
		const base64 = base64Encode(data);
		const base64url = base64URLEncode(data);
		const decodedBase64 = base64Decode(base64);
		const decodedBase64url = base64URLDecode(base64url);
		expect(decodedBase64url).toEqual(decodedBase64);
	});
});

describe("base64URL types", (): void => {
	it("base64URLEncode returns string", (): void => {
		const result = base64URLEncode("test");
		expectTypeOf(result).toBeString();
		expectTypeOf(result).not.toBeAny();
	});

	it("base64URLEncode accepts string or Uint8Array", (): void => {
		expectTypeOf(base64URLEncode)
			.parameter(0)
			.toEqualTypeOf<Uint8Array | string>();
	});

	it("base64URLDecode returns Uint8Array", (): void => {
		const result = base64URLDecode("test");
		expectTypeOf(result).toEqualTypeOf<Uint8Array>();
		expectTypeOf(result).not.toBeAny();
	});

	it("base64URLDecode accepts string", (): void => {
		expectTypeOf(base64URLDecode).parameter(0).toBeString();
	});
});
