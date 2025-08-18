// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { hexToU8a, stringToU8a, u8aToHex } from "@polkadot/util";
import { describe, expect, it } from "vitest";

import { ALICE_PUBLIC_SR } from "./encode.spec.js";
import { decodeAddress } from "./index.js";

describe("decodeAddress", (): void => {
	it("decodes an address", (): void => {
		expect(
			decodeAddress("5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"),
		).toEqual(ALICE_PUBLIC_SR);
	});

	it("decodes the council address", (): void => {
		expect(
			u8aToHex(
				decodeAddress("F3opxRbN5ZbjJNU511Kj2TLuzFcDq9BGduA9TgiECafpg29"),
			),
		).toEqual(u8aToHex(stringToU8a("modlpy/trsry".padEnd(32, "\0"))));
	});

	it("converts a publicKey (u8a) as-is", (): void => {
		expect(decodeAddress(new Uint8Array([1, 2, 3]))).toEqual(
			new Uint8Array([1, 2, 3]),
		);
	});

	it("converts a publicKey (hex) as-is", (): void => {
		expect(decodeAddress("0x01020304")).toEqual(new Uint8Array([1, 2, 3, 4]));
	});

	it("decodes a short address", (): void => {
		expect(decodeAddress("F7NZ")).toEqual(new Uint8Array([1]));
	});

	it("decodes a 1-byte accountId (with prefix)", (): void => {
		expect(decodeAddress("g4b", false, 2)).toEqual(new Uint8Array([1]));
	});

	it("decodes a 2-byte accountId", (): void => {
		expect(decodeAddress("3xygo", false, 2)).toEqual(new Uint8Array([0, 1]));
	});

	it("encodes a 4-byte address", (): void => {
		expect(decodeAddress("zswfoZa", false, 2)).toEqual(
			new Uint8Array([1, 2, 3, 4]),
		);
	});

	it("decodes a 8-byte address", (): void => {
		expect(decodeAddress("848Gh2GcGaZia", false, 2)).toEqual(
			new Uint8Array([42, 44, 10, 0, 0, 0, 0, 0]),
		);
	});

	it("decodes a 33-byte address", (): void => {
		expect(
			decodeAddress("KWCv1L3QX9LDPwY4VzvLmarEmXjVJidUzZcinvVnmxAJJCBou"),
		).toEqual(
			hexToU8a(
				"0x03b9dc646dd71118e5f7fda681ad9eca36eb3ee96f344f582fbe7b5bcdebb13077",
			),
		);
	});

	it("decodes a 2-byte prefix (65)", (): void => {
		expect(
			decodeAddress("cLtA6nCDyvwKcEHH4QkZDSHMhS9s78BvUJUsKUbUAn1Jc2SCF"),
		).toEqual(
			hexToU8a(
				"0x08e8969768fc14399930d4b8d693f68a2ff6c6a597325d6946095e5e9d9d1b0e",
			),
		);
	});

	it("decodes a 2-byte prefix (69)", (): void => {
		expect(
			decodeAddress("cnUaoo5wodnTVA4bnr4woSweto8hWZADUvLFXkR9Q6U7BRsbF"),
		).toEqual(
			hexToU8a(
				"0x88eafe0305d460d1695cf34c2f786050df8e40d215e488790cc70929c9e8316d",
			),
		);
	});

	it("decodes a 2-byte prefix (252)", (): void => {
		expect(
			decodeAddress("xw9Hca4RJTmBRgzJT4ieJBh7XCK9gE3NXBDSEmgGHd4TCrbnG"),
		).toEqual(
			hexToU8a(
				"0xfc422da6c3bc6dfa2a436a506428072941662f816987baaa8914e02ff5947f4b",
			),
		);
	});

	it("decodes a 2-byte prefix (255)", (): void => {
		expect(
			decodeAddress("yGHU8YKprxHbHdEv7oUK4rzMZXtsdhcXVG2CAMyC9WhzhjH2k"),
		).toEqual(
			decodeAddress("5GoKvZWG5ZPYL1WUovuHW3zJBWBP5eT8CbqjdRY4Q6iMaQua"),
		);
	});

	it("decodes a 2-byte prefix (ecdsa, from Substrate)", (): void => {
		expect(
			u8aToHex(
				decodeAddress("4pbsSkWcBaYoFHrKJZp5fDVUKbqSYD9dhZZGvpp3vQ5ysVs5ybV"),
			),
		).toEqual(
			"0x035676109c54b9a16d271abeb4954316a40a32bcce023ac14c8e26e958aa68fba9",
		);
	});

	it("fails when length is invalid", (): void => {
		expect(
			(): Uint8Array =>
				decodeAddress("y9EMHt34JJo4rWLSaxoLGdYXvjgSXEd4zHUnQgfNzwES8b"),
		).toThrow(/address length/);
	});

	it("fails when the checksum does not match", (): void => {
		expect(
			(): Uint8Array =>
				decodeAddress("5GoKvZWG5ZPYL1WUovuHW3zJBWBP5eT8CbqjdRY4Q6iMa9cj"),
		).toThrow(/address checksum/);
		expect(
			(): Uint8Array =>
				decodeAddress("5GoKvZWG5ZPYL1WUovuHW3zJBWBP5eT8CbqjdRY4Q6iMaDwU"),
		).toThrow(/address checksum/);
	});

	it("fails when invalid base58 encoded address is found", (): void => {
		expect(() =>
			u8aToHex(
				decodeAddress("F3opIRbN5ZbjJNU511Kj2TLuzFcDq9BGduA9TgiECafpg29"),
			),
		).toThrow(
			/Decoding F3opIRbN5ZbjJNU511Kj2TLuzFcDq9BGduA9TgiECafpg29: Invalid base58 character "I" \(0x49\) at index 4/,
		);
	});
});
