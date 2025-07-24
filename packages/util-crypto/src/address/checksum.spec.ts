// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { base58Decode } from "../base58/index.js";
import { checkAddressChecksum } from "./checksum.js";

describe("checkAddressChecksum", (): void => {
	it("correctly extracts the info from a 1-byte-prefix address", (): void => {
		expect(
			checkAddressChecksum(
				base58Decode("F3opxRbN5ZbjJNU511Kj2TLuzFcDq9BGduA9TgiECafpg29"),
			),
		).toEqual([true, 33, 1, 2]);
	});

	it("correctly extracts the info from a 2-byte-prefix address (66)", (): void => {
		expect(
			checkAddressChecksum(
				base58Decode("cTGShekJ1L1UKFZR9xmv9UTJod7vqjFAPo4sDhXih2c3y1yLS"),
			),
		).toEqual([true, 34, 2, 66]);
	});

	it("correctly extracts the info from a 2-byte-prefix address (69)", (): void => {
		expect(
			checkAddressChecksum(
				base58Decode("cnVvyMzRdqjwejTFuByQQ4w2yu78V2hpFixjHQz5zr6NSYsxA"),
			),
		).toEqual([true, 34, 2, 69]);
	});

	it("correctly extracts the info from a 2-byte-prefix address (252)", (): void => {
		expect(
			checkAddressChecksum(
				base58Decode("xw8Ffc2SZtDqUJKd9Ky4vc7PRz2D2asuVkEEzf3WGAbw9cnfq"),
			),
		).toEqual([true, 34, 2, 252]);
	});

	it("correctly extracts the info from a 2-byte-prefix address (255)", (): void => {
		expect(
			checkAddressChecksum(
				base58Decode("yGHU8YKprxHbHdEv7oUK4rzMZXtsdhcXVG2CAMyC9WhzhjH2k"),
			),
		).toEqual([true, 34, 2, 255]);
	});

	it("correctly extracts the info from a 2-byte-prefix address (ecdsa, from Substrate)", (): void => {
		expect(
			checkAddressChecksum(
				base58Decode("4pbsSkWcBaYoFHrKJZp5fDVUKbqSYD9dhZZGvpp3vQ5ysVs5ybV"),
			),
		).toEqual([true, 35, 2, 200]);
	});
});
