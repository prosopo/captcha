// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { encodeAddress } from "./index.js";

// biome-ignore lint/suspicious/noExportsInTest: <explanation>
export const ALICE_PUBLIC_SR = new Uint8Array([
	212, 53, 147, 199, 21, 253, 211, 28, 97, 20, 26, 189, 4, 169, 159, 214, 130,
	44, 133, 88, 133, 76, 205, 227, 154, 86, 132, 231, 165, 109, 162, 125,
]);

// biome-ignore lint/suspicious/noExportsInTest: <explanation>
export const ALICE_PUBLIC_ED = new Uint8Array([
	209, 114, 167, 76, 218, 76, 134, 89, 18, 195, 43, 160, 168, 10, 87, 174, 105,
	171, 174, 65, 14, 92, 203, 89, 222, 232, 78, 47, 68, 50, 219, 79,
]);

const SUBKEY = [
	{
		// substrate default
		address: "5DA4D4GL5iakrn22h5uKoevgvo18Pqj5BcdEUv8etEDPdijA",
		publicKey:
			"0x3050f8456519829fe03302da802d22d3233a5f4037b9a3e2bcc403ccfcb2d735",
		ss58Format: 42,
	},
	{
		// aventus
		address: "cLtA6nCDyvwKcEHH4QkZDSHMhS9s78BvUJUsKUbUAn1Jc2SCF",
		publicKey:
			"0x08e8969768fc14399930d4b8d693f68a2ff6c6a597325d6946095e5e9d9d1b0e",
		ss58Format: 65,
	},
	{
		// crust
		address: "cTGShekJ1L1UKFZR9xmv9UTJod7vqjFAPo4sDhXih2c3y1yLS",
		publicKey:
			"0x04a047d52fe542484c69bc528990cfeaf3a663dded0638ee1b51cf78bacd1072",
		ss58Format: 66,
	},
	{
		// sora
		address: "cnVRwXfAnz3RSVQyBUC8f8McrK3YBX2QYd4WoctpeSC6VTJYm",
		publicKey:
			"0xae640d53cfa815f4a6a50ae70235cd7d9d134d0f1c3a4ccd118e321dfb6ab51f",
		ss58Format: 69,
	},
	{
		// ecdsa
		address: "4pbsSkWcBaYoFHrKJZp5fDVUKbqSYD9dhZZGvpp3vQ5ysVs5ybV",
		publicKey:
			"0x035676109c54b9a16d271abeb4954316a40a32bcce023ac14c8e26e958aa68fba9",
		ss58Format: 200,
	},
	{
		// social-network
		address: "xw5g1Eec8LT99pZLZMaTWwrwvNtfM6vrSuZeVbtEszCDUwByg",
		publicKey:
			"0x5c64f1151f0ce4358c27238fb20c88e7c899825436f565410724c8c2c5add869",
		ss58Format: 252,
	},
	{
		address: "yGF4JP7q5AK46d1FPCEm9sYQ4KooSjHMpyVAjLnsCSWVafPnf",
		publicKey:
			"0x66cd6cf085627d6c85af1aaf2bd10cf843033e929b4e3b1c2ba8e4aa46fe111b",
		ss58Format: 255,
	},
	{
		address: "yGDYxQatQwuxqT39Zs4LtcTnpzE12vXb7ZJ6xpdiHv6gTu1hF",
		publicKey:
			"0x242fd5a078ac6b7c3c2531e9bcf1314343782aeb58e7bc6880794589e701db55",
		ss58Format: 255,
	},
	{
		address: "mHm8k9Emsvyfp3piCauSH684iA6NakctF8dySQcX94GDdrJrE",
		publicKey:
			"0x44d5a3ac156335ea99d33a83c57c7146c40c8e2260a8a4adf4e7a86256454651",
		ss58Format: 4242,
	},
	{
		address: "r6Gr4gaMP8TsjhFbqvZhv3YvnasugLiRJpzpRHifsqqG18UXa",
		publicKey:
			"0x88f01441682a17b52d6ae12d1a5670cf675fd254897efabaa5069eb3a701ab73",
		ss58Format: 14269,
	},
];

describe("encode", (): void => {
	it("encodes an address to a valid value", (): void => {
		expect(encodeAddress(ALICE_PUBLIC_ED)).toEqual(
			"5GoKvZWG5ZPYL1WUovuHW3zJBWBP5eT8CbqjdRY4Q6iMaQua",
		);
	});

	it("can re-encode an address", (): void => {
		expect(
			encodeAddress("5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY", 2),
		).toEqual("HNZata7iMYWmk5RvZRTiAsSDhV8366zq2YGb3tLH5Upf74F");
	});

	it("can re-encode an address to Polkadot live", (): void => {
		expect(
			encodeAddress("5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY", 0),
		).toEqual("15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5");
	});

	it("fails when non-valid publicKey provided", (): void => {
		expect((): string => encodeAddress(ALICE_PUBLIC_ED.slice(0, 30))).toThrow(
			/Expected a valid key/,
		);
	});

	it("encodes a 1-byte address", (): void => {
		expect(encodeAddress(new Uint8Array([1]))).toEqual("F7NZ");
	});

	it("encodes a 1-byte address (with prefix)", (): void => {
		expect(encodeAddress(new Uint8Array([1]), 2)).toEqual("g4b");
	});

	it("encodes a 2-byte address", (): void => {
		expect(encodeAddress(new Uint8Array([0, 1]), 2)).toEqual("3xygo");
	});

	it("encodes a 4-byte address", (): void => {
		expect(encodeAddress(new Uint8Array([1, 2, 3, 4]), 2)).toEqual("zswfoZa");
	});

	it("encodes a 8-byte address", (): void => {
		expect(
			encodeAddress(new Uint8Array([42, 44, 10, 0, 0, 0, 0, 0]), 2),
		).toEqual("848Gh2GcGaZia");
	});

	it("encodes an 33-byte address", (): void => {
		expect(
			encodeAddress(
				"0x03b9dc646dd71118e5f7fda681ad9eca36eb3ee96f344f582fbe7b5bcdebb13077",
			),
		).toEqual("KWCv1L3QX9LDPwY4VzvLmarEmXjVJidUzZcinvVnmxAJJCBou");
	});

	it("encodes with 2 byte prefix", (): void => {
		expect(encodeAddress(ALICE_PUBLIC_ED, 255)).toEqual(
			"yGHU8YKprxHbHdEv7oUK4rzMZXtsdhcXVG2CAMyC9WhzhjH2k",
		);
	});

	SUBKEY.forEach(({ address, publicKey, ss58Format }, index): void => {
		it(`encodes with Subkey equality (${index} - ${ss58Format})`, (): void => {
			expect(encodeAddress(publicKey, ss58Format)).toEqual(address);
		});
	});

	it("does not encode for > 16,383, < 0", (): void => {
		expect(() => encodeAddress(ALICE_PUBLIC_ED, -1)).toThrow(
			/range ss58Format specified/,
		);
		expect(() => encodeAddress(ALICE_PUBLIC_ED, 16384)).toThrow(
			/range ss58Format specified/,
		);
	});

	it("does not encode reserved", (): void => {
		expect(() => encodeAddress(ALICE_PUBLIC_ED, 46)).toThrow(
			/range ss58Format specified/,
		);
		expect(() => encodeAddress(ALICE_PUBLIC_ED, 47)).toThrow(
			/range ss58Format specified/,
		);
	});
});
