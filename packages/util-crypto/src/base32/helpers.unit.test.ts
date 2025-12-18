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

import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
	createDecode,
	createEncode,
	createIs,
	createValidate,
} from "./helpers.js";

// Mock config for testing
const mockConfig = {
	chars: "abcdefghijklmnopqrstuvwxyz234567",
	coder: {
		decode: (value: string): Uint8Array => {
			// Simple mock: convert string to bytes
			return new TextEncoder().encode(value);
		},
		encode: (value: Uint8Array): string => {
			// Simple mock: convert bytes to string
			return new TextDecoder().decode(value);
		},
	},
	ipfs: "b",
	type: "base32",
	withPadding: false,
};

const mockConfigWithPadding = {
	...mockConfig,
	withPadding: true,
};

describe("createValidate", (): void => {
	it("returns a validation function", (): void => {
		const validate = createValidate(mockConfig);
		expect(typeof validate).toBe("function");
	});

	it("validates string input successfully", (): void => {
		const validate = createValidate(mockConfig);
		expect(validate("abcd")).toBe(true);
	});

	it("throws error for non-string input", (): void => {
		const validate = createValidate(mockConfig);
		expect(() => validate(123)).toThrow("Expected base32 string input");
		expect(() => validate(null)).toThrow("Expected base32 string input");
		expect(() => validate(undefined)).toThrow("Expected base32 string input");
	});

	it("throws error for invalid characters", (): void => {
		const validate = createValidate(mockConfig);
		// '8' and '9' are not in the base32 charset (which ends at '7')
		expect(() => validate("abc89")).toThrow(/Invalid base32 character/);
	});

	it("validates ipfs-compatible strings", (): void => {
		const validate = createValidate(mockConfig);
		expect(validate("babcd", true)).toBe(true);
	});

	it("throws error for ipfs string without correct prefix", (): void => {
		const validate = createValidate(mockConfig);
		expect(() => validate("xabcd", true)).toThrow(
			/Expected ipfs-compatible base32 to start with 'b'/,
		);
	});

	it("validates padding in padded config", (): void => {
		const validate = createValidate(mockConfigWithPadding);
		expect(validate("abcd==")).toBe(true);
	});

	it("throws error for invalid padding sequence", (): void => {
		const validate = createValidate(mockConfigWithPadding);
		// Invalid: padding not at end
		expect(() => validate("ab=cd")).toThrow(/Invalid base32 padding sequence/);
	});

	it("allows valid padding at end", (): void => {
		const validate = createValidate(mockConfigWithPadding);
		expect(validate("abcd=")).toBe(true);
		expect(validate("abcd==")).toBe(true);
	});

	it("throws error for undefined character", (): void => {
		const validate = createValidate(mockConfig);
		// Create string with undefined by accessing out of bounds
		const invalidStr = "abc" + String.fromCharCode(0);
		// This should validate the characters normally
		expect(() => validate(invalidStr)).toThrow(/Invalid base32 character/);
	});
});

describe("createIs", (): void => {
	it("returns a validation function", (): void => {
		const validate = createValidate(mockConfig);
		const is = createIs(validate);
		expect(typeof is).toBe("function");
	});

	it("returns true for valid input", (): void => {
		const validate = createValidate(mockConfig);
		const is = createIs(validate);
		expect(is("abcd")).toBe(true);
	});

	it("returns false for invalid input instead of throwing", (): void => {
		const validate = createValidate(mockConfig);
		const is = createIs(validate);
		expect(is("abc89")).toBe(false); // '8' and '9' not in charset
		expect(is(123)).toBe(false);
		expect(is(null)).toBe(false);
	});

	it("returns true for ipfs-compatible valid input", (): void => {
		const validate = createValidate(mockConfig);
		const is = createIs(validate);
		expect(is("babcd", true)).toBe(true);
	});

	it("returns false for ipfs-compatible invalid input", (): void => {
		const validate = createValidate(mockConfig);
		const is = createIs(validate);
		expect(is("xabcd", true)).toBe(false);
	});
});

describe("createDecode", (): void => {
	it("returns a decode function", (): void => {
		const validate = createValidate(mockConfig);
		const decode = createDecode(mockConfig, validate);
		expect(typeof decode).toBe("function");
	});

	it("decodes valid string", (): void => {
		const validate = createValidate(mockConfig);
		const decode = createDecode(mockConfig, validate);
		const result = decode("abcd");
		expect(result).toBeInstanceOf(Uint8Array);
	});

	it("validates before decoding", (): void => {
		const validate = createValidate(mockConfig);
		const decode = createDecode(mockConfig, validate);
		expect(() => decode("abc89")).toThrow(/Invalid base32 character/);
	});

	it("strips ipfs prefix when ipfsCompat is true", (): void => {
		const mockValidate = vi.fn(() => true);
		const mockCoder = {
			decode: vi.fn((value: string) => new TextEncoder().encode(value)),
			encode: vi.fn(),
		};
		const config = {
			...mockConfig,
			coder: mockCoder,
		};
		const decode = createDecode(config, mockValidate);

		decode("babcd", true);

		// Should call coder.decode with the prefix stripped
		expect(mockCoder.decode).toHaveBeenCalledWith("abcd");
	});

	it("does not strip prefix when ipfsCompat is false", (): void => {
		const mockValidate = vi.fn(() => true);
		const mockCoder = {
			decode: vi.fn((value: string) => new TextEncoder().encode(value)),
			encode: vi.fn(),
		};
		const config = {
			...mockConfig,
			coder: mockCoder,
		};
		const decode = createDecode(config, mockValidate);

		decode("babcd", false);

		// Should call coder.decode with full string
		expect(mockCoder.decode).toHaveBeenCalledWith("babcd");
	});
});

describe("createEncode", (): void => {
	it("returns an encode function", (): void => {
		const encode = createEncode(mockConfig);
		expect(typeof encode).toBe("function");
	});

	it("encodes Uint8Array", (): void => {
		const encode = createEncode(mockConfig);
		const input = new Uint8Array([1, 2, 3, 4, 5]);
		const result = encode(input);
		expect(typeof result).toBe("string");
	});

	it("encodes string input by converting to Uint8Array", (): void => {
		const encode = createEncode(mockConfig);
		const result = encode("test");
		expect(typeof result).toBe("string");
	});

	it("adds ipfs prefix when ipfsCompat is true", (): void => {
		const mockCoder = {
			decode: vi.fn(),
			encode: vi.fn((value: Uint8Array) => "encoded"),
		};
		const config = {
			...mockConfig,
			coder: mockCoder,
		};
		const encode = createEncode(config);

		const result = encode(new Uint8Array([1, 2, 3]), true);

		expect(result).toBe("bencoded");
	});

	it("does not add ipfs prefix when ipfsCompat is false", (): void => {
		const mockCoder = {
			decode: vi.fn(),
			encode: vi.fn((value: Uint8Array) => "encoded"),
		};
		const config = {
			...mockConfig,
			coder: mockCoder,
		};
		const encode = createEncode(config);

		const result = encode(new Uint8Array([1, 2, 3]), false);

		expect(result).toBe("encoded");
	});

	it("does not add prefix when ipfs is not defined", (): void => {
		const mockCoder = {
			decode: vi.fn(),
			encode: vi.fn((value: Uint8Array) => "encoded"),
		};
		const config = {
			...mockConfig,
			coder: mockCoder,
			ipfs: undefined,
		};
		const encode = createEncode(config);

		const result = encode(new Uint8Array([1, 2, 3]), true);

		expect(result).toBe("encoded");
	});
});

describe("helpers types", (): void => {
	it("createValidate returns type guard", (): void => {
		const validate = createValidate(mockConfig);
		expectTypeOf(validate).returns.toEqualTypeOf<boolean>();
	});

	it("createIs returns type guard", (): void => {
		const validate = createValidate(mockConfig);
		const is = createIs(validate);
		expectTypeOf(is).returns.toEqualTypeOf<boolean>();
	});

	it("createDecode returns Uint8Array", (): void => {
		const validate = createValidate(mockConfig);
		const decode = createDecode(mockConfig, validate);
		expectTypeOf(decode).returns.toEqualTypeOf<Uint8Array>();
	});

	it("createEncode returns string", (): void => {
		const encode = createEncode(mockConfig);
		expectTypeOf(encode).returns.toEqualTypeOf<string>();
	});
});
