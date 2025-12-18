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
import { sr25519VrfVerify } from "./vrfVerify.js";

// Mock @scure/sr25519 vrf
vi.mock("@scure/sr25519", () => ({
	vrf: {
		verify: vi.fn(
			(
				message: Uint8Array,
				signature: Uint8Array,
				publicKey: Uint8Array,
				context: Uint8Array,
				extra: Uint8Array,
			): boolean => {
				// Mock verification: return true if signature and publicKey match
				return signature.length === 96 && publicKey.length === 32;
			},
		),
	},
}));

describe("sr25519VrfVerify", (): void => {
	it("returns boolean", (): void => {
		const message = "test message";
		const signOutput = new Uint8Array(96).fill(0x01);
		const publicKey = new Uint8Array(32).fill(0x02);

		const result = sr25519VrfVerify(message, signOutput, publicKey);

		expect(typeof result).toBe("boolean");
	});

	it("verifies with string message", (): void => {
		const message = "test message";
		const signOutput = new Uint8Array(96).fill(0x01);
		const publicKey = new Uint8Array(32).fill(0x02);

		const result = sr25519VrfVerify(message, signOutput, publicKey);

		expect(result).toBe(true);
	});

	it("verifies with Uint8Array message", (): void => {
		const message = new Uint8Array([1, 2, 3, 4, 5]);
		const signOutput = new Uint8Array(96).fill(0x01);
		const publicKey = new Uint8Array(32).fill(0x02);

		const result = sr25519VrfVerify(message, signOutput, publicKey);

		expect(result).toBe(true);
	});

	it("throws error for invalid public key length", (): void => {
		const message = "test message";
		const signOutput = new Uint8Array(96).fill(0x01);
		const publicKey = new Uint8Array(16); // Wrong length

		expect(() => sr25519VrfVerify(message, signOutput, publicKey)).toThrow(
			"Invalid publicKey length, expected 32 bytes",
		);
	});

	it("throws error for invalid signature length", (): void => {
		const message = "test message";
		const signOutput = new Uint8Array(64); // Wrong length, should be 96
		const publicKey = new Uint8Array(32).fill(0x02);

		expect(() => sr25519VrfVerify(message, signOutput, publicKey)).toThrow(
			"Invalid vrfSign output length, expected 96 bytes",
		);
	});

	it("accepts 32-byte public key", (): void => {
		const message = "test message";
		const signOutput = new Uint8Array(96).fill(0x01);
		const publicKey = new Uint8Array(32).fill(0x02);

		expect(() =>
			sr25519VrfVerify(message, signOutput, publicKey),
		).not.toThrow();
	});

	it("accepts 96-byte signature", (): void => {
		const message = "test message";
		const signOutput = new Uint8Array(96).fill(0x01);
		const publicKey = new Uint8Array(32).fill(0x02);

		expect(() =>
			sr25519VrfVerify(message, signOutput, publicKey),
		).not.toThrow();
	});

	it("works with context parameter", (): void => {
		const message = "test message";
		const signOutput = new Uint8Array(96).fill(0x01);
		const publicKey = new Uint8Array(32).fill(0x02);
		const context = "test context";

		const result = sr25519VrfVerify(message, signOutput, publicKey, context);

		expect(typeof result).toBe("boolean");
	});

	it("works with Uint8Array context", (): void => {
		const message = "test message";
		const signOutput = new Uint8Array(96).fill(0x01);
		const publicKey = new Uint8Array(32).fill(0x02);
		const context = new Uint8Array([1, 2, 3]);

		const result = sr25519VrfVerify(message, signOutput, publicKey, context);

		expect(typeof result).toBe("boolean");
	});

	it("works with extra parameter", (): void => {
		const message = "test message";
		const signOutput = new Uint8Array(96).fill(0x01);
		const publicKey = new Uint8Array(32).fill(0x02);
		const context = "test context";
		const extra = "extra data";

		const result = sr25519VrfVerify(
			message,
			signOutput,
			publicKey,
			context,
			extra,
		);

		expect(typeof result).toBe("boolean");
	});

	it("works with Uint8Array extra", (): void => {
		const message = "test message";
		const signOutput = new Uint8Array(96).fill(0x01);
		const publicKey = new Uint8Array(32).fill(0x02);
		const context = "test context";
		const extra = new Uint8Array([4, 5, 6]);

		const result = sr25519VrfVerify(
			message,
			signOutput,
			publicKey,
			context,
			extra,
		);

		expect(typeof result).toBe("boolean");
	});

	it("uses empty context when not provided", (): void => {
		const message = "test message";
		const signOutput = new Uint8Array(96).fill(0x01);
		const publicKey = new Uint8Array(32).fill(0x02);

		const result = sr25519VrfVerify(message, signOutput, publicKey);

		expect(typeof result).toBe("boolean");
	});

	it("uses empty extra when not provided", (): void => {
		const message = "test message";
		const signOutput = new Uint8Array(96).fill(0x01);
		const publicKey = new Uint8Array(32).fill(0x02);
		const context = "test context";

		const result = sr25519VrfVerify(message, signOutput, publicKey, context);

		expect(typeof result).toBe("boolean");
	});

	it("handles string inputs for all parameters", (): void => {
		const message = "test message";
		const signOutput = "a".repeat(96); // String signature
		const publicKey = "b".repeat(32); // String public key
		const context = "test context";
		const extra = "extra data";

		const result = sr25519VrfVerify(
			message,
			signOutput,
			publicKey,
			context,
			extra,
		);

		expect(typeof result).toBe("boolean");
	});

	it("handles empty message", (): void => {
		const message = "";
		const signOutput = new Uint8Array(96).fill(0x01);
		const publicKey = new Uint8Array(32).fill(0x02);

		const result = sr25519VrfVerify(message, signOutput, publicKey);

		expect(typeof result).toBe("boolean");
	});

	it("handles large message", (): void => {
		const message = "a".repeat(10000);
		const signOutput = new Uint8Array(96).fill(0x01);
		const publicKey = new Uint8Array(32).fill(0x02);

		const result = sr25519VrfVerify(message, signOutput, publicKey);

		expect(typeof result).toBe("boolean");
	});
});

describe("sr25519VrfVerify types", (): void => {
	it("accepts string or Uint8Array message", (): void => {
		expectTypeOf(sr25519VrfVerify)
			.parameter(0)
			.toEqualTypeOf<string | Uint8Array>();
	});

	it("accepts string or Uint8Array signOutput", (): void => {
		expectTypeOf(sr25519VrfVerify)
			.parameter(1)
			.toEqualTypeOf<string | Uint8Array>();
	});

	it("accepts string or Uint8Array publicKey", (): void => {
		expectTypeOf(sr25519VrfVerify)
			.parameter(2)
			.toEqualTypeOf<string | Uint8Array>();
	});

	it("accepts optional context parameter", (): void => {
		expectTypeOf(sr25519VrfVerify)
			.parameter(3)
			.toEqualTypeOf<string | Uint8Array | undefined>();
	});

	it("accepts optional extra parameter", (): void => {
		expectTypeOf(sr25519VrfVerify)
			.parameter(4)
			.toEqualTypeOf<string | Uint8Array | undefined>();
	});

	it("returns boolean", (): void => {
		const result = sr25519VrfVerify(
			"test",
			new Uint8Array(96),
			new Uint8Array(32),
		);
		expectTypeOf(result).toEqualTypeOf<boolean>();
		expectTypeOf(result).not.toBeAny();
	});
});
