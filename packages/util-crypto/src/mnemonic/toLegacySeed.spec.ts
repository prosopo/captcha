// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { u8aEq, u8aToHex } from "@polkadot/util";
import { describe, expect, it } from "vitest";

import { mnemonicToLegacySeed } from "./index.js";

const MNEMONIC =
	"seed sock milk update focus rotate barely fade car face mechanic mercy";
const SEED_32 =
	"0x3c121e20de068083b49c2315697fb59a2d9e8643c24e5ea7628132c58969a027";
const SEED_64 =
	"0x3c121e20de068083b49c2315697fb59a2d9e8643c24e5ea7628132c58969a0275693dd5bd9d4cc9e648475eba9613ed4678f4d62560a9c42f75bac04022ded25";

describe("mnemonicToLegacySeed", (): void => {
	for (const password of [undefined, "foo", "bar"]) {
		it(`generates Wasm & Js equivalents for password=${password || "undefined"}`, (): void => {
			expect(
				u8aEq(
					mnemonicToLegacySeed(MNEMONIC, password, true),
					mnemonicToLegacySeed(MNEMONIC, password, false),
				),
			).toEqual(true);
		});
	}

	for (const onlyJs of [false, true]) {
		describe(`onlyJs=${(onlyJs && "true") || "false"}`, (): void => {
			it("generates a valid 64bytes seed", (): void => {
				expect(
					u8aToHex(mnemonicToLegacySeed(MNEMONIC, undefined, onlyJs, 64)),
				).toEqual(SEED_64);
			});

			it("generates a valid 32bytes seed", (): void => {
				expect(
					u8aToHex(mnemonicToLegacySeed(MNEMONIC, undefined, onlyJs)),
				).toEqual(SEED_32);
			});

			it("fails with non-mnemonics", (): void => {
				expect(() =>
					mnemonicToLegacySeed("foo bar baz", undefined, onlyJs),
				).toThrow(/mnemonic specified/);
			});
		});
	}
});
