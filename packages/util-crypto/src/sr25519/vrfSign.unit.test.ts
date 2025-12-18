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
import { sr25519VrfSign } from "./vrfSign.js";
import type { Keypair } from "../types.js";

// Mock @scure/sr25519 vrf
vi.mock("@scure/sr25519", () => ({
	vrf: {
		sign: vi.fn(
			(
				message: Uint8Array,
				secretKey: Uint8Array,
				context: Uint8Array,
				extra: Uint8Array,
			) => {
				// Mock VRF signature output (96 bytes)
				const output = new Uint8Array(96);
				// Create hash-like pattern based on message content
				let seed = 0;
				for (let i = 0; i < message.length; i++) {
					seed = (seed * 31 + message[i]) % 256;
				}
				// Fill with pattern based on message hash
				for (let i = 0; i < 96; i++) {
					output[i] = (i + seed + secretKey[i % 64]) % 256;
				}
				return output;
			},
		),
	},
}));

describe("sr25519VrfSign", (): void => {
	it("returns a Uint8Array signature", (): void => {
		const message = "test message";
		const keypair: Partial<Keypair> = {
			secretKey: new Uint8Array(64).fill(0x01),
		};

		const result = sr25519VrfSign(message, keypair);

		expect(result).toBeInstanceOf(Uint8Array);
	});

	it("signs with string message", (): void => {
		const message = "test message";
		const keypair: Partial<Keypair> = {
			secretKey: new Uint8Array(64).fill(0x01),
		};

		const result = sr25519VrfSign(message, keypair);

		expect(result).toBeInstanceOf(Uint8Array);
		expect(result.length).toBeGreaterThan(0);
	});

	it("signs with Uint8Array message", (): void => {
		const message = new Uint8Array([1, 2, 3, 4, 5]);
		const keypair: Partial<Keypair> = {
			secretKey: new Uint8Array(64).fill(0x01),
		};

		const result = sr25519VrfSign(message, keypair);

		expect(result).toBeInstanceOf(Uint8Array);
		expect(result.length).toBeGreaterThan(0);
	});

	it("throws error for invalid secret key length", (): void => {
		const message = "test message";
		const keypair: Partial<Keypair> = {
			secretKey: new Uint8Array(32), // Wrong length, should be 64
		};

		expect(() => sr25519VrfSign(message, keypair)).toThrow(
			"Invalid secretKey length, expected 64 bytes",
		);
	});

	it("accepts 64-byte secret key", (): void => {
		const message = "test message";
		const keypair: Partial<Keypair> = {
			secretKey: new Uint8Array(64).fill(0x01),
		};

		expect(() => sr25519VrfSign(message, keypair)).not.toThrow();
	});

	it("works with context parameter", (): void => {
		const message = "test message";
		const keypair: Partial<Keypair> = {
			secretKey: new Uint8Array(64).fill(0x01),
		};
		const context = "test context";

		const result = sr25519VrfSign(message, keypair, context);

		expect(result).toBeInstanceOf(Uint8Array);
	});

	it("works with Uint8Array context", (): void => {
		const message = "test message";
		const keypair: Partial<Keypair> = {
			secretKey: new Uint8Array(64).fill(0x01),
		};
		const context = new Uint8Array([1, 2, 3]);

		const result = sr25519VrfSign(message, keypair, context);

		expect(result).toBeInstanceOf(Uint8Array);
	});

	it("works with extra parameter", (): void => {
		const message = "test message";
		const keypair: Partial<Keypair> = {
			secretKey: new Uint8Array(64).fill(0x01),
		};
		const context = "test context";
		const extra = "extra data";

		const result = sr25519VrfSign(message, keypair, context, extra);

		expect(result).toBeInstanceOf(Uint8Array);
	});

	it("works with Uint8Array extra", (): void => {
		const message = "test message";
		const keypair: Partial<Keypair> = {
			secretKey: new Uint8Array(64).fill(0x01),
		};
		const context = "test context";
		const extra = new Uint8Array([4, 5, 6]);

		const result = sr25519VrfSign(message, keypair, context, extra);

		expect(result).toBeInstanceOf(Uint8Array);
	});

	it("uses empty context when not provided", (): void => {
		const message = "test message";
		const keypair: Partial<Keypair> = {
			secretKey: new Uint8Array(64).fill(0x01),
		};

		// Should not throw when context is not provided
		const result = sr25519VrfSign(message, keypair);

		expect(result).toBeInstanceOf(Uint8Array);
	});

	it("uses empty extra when not provided", (): void => {
		const message = "test message";
		const keypair: Partial<Keypair> = {
			secretKey: new Uint8Array(64).fill(0x01),
		};
		const context = "test context";

		// Should not throw when extra is not provided
		const result = sr25519VrfSign(message, keypair, context);

		expect(result).toBeInstanceOf(Uint8Array);
	});

	it("produces different signatures for different messages", (): void => {
		const keypair: Partial<Keypair> = {
			secretKey: new Uint8Array(64).fill(0x01),
		};

		const sig1 = sr25519VrfSign("message1", keypair);
		const sig2 = sr25519VrfSign("message2", keypair);

		expect(sig1).not.toEqual(sig2);
	});

	it("handles empty message", (): void => {
		const message = "";
		const keypair: Partial<Keypair> = {
			secretKey: new Uint8Array(64).fill(0x01),
		};

		const result = sr25519VrfSign(message, keypair);

		expect(result).toBeInstanceOf(Uint8Array);
	});

	it("handles large message", (): void => {
		const message = "a".repeat(10000);
		const keypair: Partial<Keypair> = {
			secretKey: new Uint8Array(64).fill(0x01),
		};

		const result = sr25519VrfSign(message, keypair);

		expect(result).toBeInstanceOf(Uint8Array);
	});
});

describe("sr25519VrfSign types", (): void => {
	it("accepts string or Uint8Array message", (): void => {
		expectTypeOf(sr25519VrfSign)
			.parameter(0)
			.toEqualTypeOf<string | Uint8Array>();
	});

	it("accepts Partial<Keypair> parameter", (): void => {
		expectTypeOf(sr25519VrfSign)
			.parameter(1)
			.toEqualTypeOf<Partial<Keypair>>();
	});

	it("accepts optional context parameter", (): void => {
		expectTypeOf(sr25519VrfSign)
			.parameter(2)
			.toEqualTypeOf<string | Uint8Array | undefined>();
	});

	it("accepts optional extra parameter", (): void => {
		expectTypeOf(sr25519VrfSign)
			.parameter(3)
			.toEqualTypeOf<string | Uint8Array | undefined>();
	});

	it("returns Uint8Array", (): void => {
		const keypair: Partial<Keypair> = {
			secretKey: new Uint8Array(64),
		};
		const result = sr25519VrfSign("test", keypair);
		expectTypeOf(result).toEqualTypeOf<Uint8Array>();
		expectTypeOf(result).not.toBeAny();
	});
});
