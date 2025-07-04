// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { validateAddress } from "./index.js";

describe("validateAddress", (): void => {
	it("decodes an address", (): void => {
		expect(
			validateAddress("5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"),
		).toEqual(true);
	});

	it("decodes the council address", (): void => {
		expect(
			validateAddress("F3opxRbN5ZbjJNU511Kj2TLuzFcDq9BGduA9TgiECafpg29"),
		).toEqual(true);
	});

	it("converts a publicKey (hex) as-is", (): void => {
		expect(validateAddress("0x01020304")).toEqual(true);
	});

	it("decodes a short address", (): void => {
		expect(validateAddress("F7NZ")).toEqual(true);
	});

	it("decodes a 1-byte accountId (with prefix)", (): void => {
		expect(validateAddress("g4b", false, 2)).toEqual(true);
	});

	it("decodes a 2-byte accountId", (): void => {
		expect(validateAddress("3xygo", false, 2)).toEqual(true);
	});

	it("encodes a 4-byte address", (): void => {
		expect(validateAddress("zswfoZa", false, 2)).toEqual(true);
	});

	it("decodes a 8-byte address", (): void => {
		expect(validateAddress("848Gh2GcGaZia", false, 2)).toEqual(true);
	});

	it("decodes a 33-byte address", (): void => {
		expect(
			validateAddress("KWCv1L3QX9LDPwY4VzvLmarEmXjVJidUzZcinvVnmxAJJCBou"),
		).toEqual(true);
	});

	it("decodes a 2-byte prefix (65)", (): void => {
		expect(
			validateAddress("cLtA6nCDyvwKcEHH4QkZDSHMhS9s78BvUJUsKUbUAn1Jc2SCF"),
		).toEqual(true);
	});

	it("decodes a 2-byte prefix (69)", (): void => {
		expect(
			validateAddress("cnUaoo5wodnTVA4bnr4woSweto8hWZADUvLFXkR9Q6U7BRsbF"),
		).toEqual(true);
	});

	it("decodes a 2-byte prefix (252)", (): void => {
		expect(
			validateAddress("xw9Hca4RJTmBRgzJT4ieJBh7XCK9gE3NXBDSEmgGHd4TCrbnG"),
		).toEqual(true);
	});

	it("decodes a 2-byte prefix (255)", (): void => {
		expect(
			validateAddress("yGHU8YKprxHbHdEv7oUK4rzMZXtsdhcXVG2CAMyC9WhzhjH2k"),
		).toEqual(true);
	});

	it("decodes a 2-byte prefix (ecdsa, from Substrate)", (): void => {
		expect(
			validateAddress("4pbsSkWcBaYoFHrKJZp5fDVUKbqSYD9dhZZGvpp3vQ5ysVs5ybV"),
		).toEqual(true);
	});

	it("fails when length is invalid", (): void => {
		expect(() =>
			validateAddress("y9EMHt34JJo4rWLSaxoLGdYXvjgSXEd4zHUnQgfNzwES8b"),
		).toThrow(/address length/);
	});

	it("fails when the checksum does not match", (): void => {
		expect(() =>
			validateAddress("5GoKvZWG5ZPYL1WUovuHW3zJBWBP5eT8CbqjdRY4Q6iMa9cj"),
		).toThrow(/address checksum/);
		expect(() =>
			validateAddress("5GoKvZWG5ZPYL1WUovuHW3zJBWBP5eT8CbqjdRY4Q6iMaDwU"),
		).toThrow(/address checksum/);
	});

	it("fails when invalid base58 encoded address is found", (): void => {
		expect(() =>
			validateAddress("F3opIRbN5ZbjJNU511Kj2TLuzFcDq9BGduA9TgiECafpg29"),
		).toThrow(
			/Decoding F3opIRbN5ZbjJNU511Kj2TLuzFcDq9BGduA9TgiECafpg29: Invalid base58 character "I" \(0x49\) at index 4/,
		);
	});
});
