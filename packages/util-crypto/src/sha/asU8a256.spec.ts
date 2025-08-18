// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { hexToU8a } from "@polkadot/util";
import { describe, expect, it } from "vitest";
import { sha256AsU8a } from "./index.js";

const TESTS = [
	{
		input: "0xe3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
		output:
			"0x5df6e0e2761359d30a8275058e299fcc0381534545f55cf43e41983f5d4c9456",
	},
	{
		input: "0x7941cb07924fdc7b710e11d98d82850e89566e1c3cb980517ffe4b430f86dfd5",
		output:
			"0xe668668fa102ccd4d3cf50e4472be8426e7dc52d6d355bee8c5e2177d1de81f7",
	},
	{
		input: "0x5d9a905bc3ca7c153623af0a05231960eb3f5bdd5b8b7b55ede8b2deac689d65",
		output:
			"0x6721bc38e80d03f4f45f1544819d17e0c33674eb6efcddf6c6192cd78194dd9f",
	},
	{
		input: "0xb0cd6528ae4d5baf7c6f0d202e7f372b6488d22b2a5bd72f794f8f1e6031b31f",
		output:
			"0x353f5a030af27885aed3571cd9e2cac9f4331c51d31cef496a586496aec32256",
	},
	{
		input: "0x841267bd4110e1b634e17cd019abc6ae4f9a6dd097fb063000c1615a643b5463",
		output:
			"0x8174a30d921978e7055516189872cca737b49468c6bcf7fdfe59d4a54c489a1f",
	},
];

describe("sha256AsU8a", (): void => {
	for (const onlyJs of [false, true]) {
		describe(`onlyJs=${(onlyJs && "true") || "false"}`, (): void => {
			for (const { input, output } of TESTS) {
				it(`creates known sha-256 hash, ${output}`, (): void => {
					expect(sha256AsU8a(hexToU8a(input))).toEqual(hexToU8a(output));
				});
			}
		});
	}
});
