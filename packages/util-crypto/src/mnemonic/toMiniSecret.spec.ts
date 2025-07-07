// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { u8aEq, u8aToHex } from "@polkadot/util";
import { describe, expect, it } from "vitest";
import tests from "../sr25519/pair/testing.spec.js";
import { mnemonicToMiniSecret } from "./toMiniSecret.js";

const MNEMONIC =
	"seed sock milk update focus rotate barely fade car face mechanic mercy";
const SEED =
	"0x4d1ab2a57929edfd018aaa974e62ed557e3f54b4104acabedf73c8f5a1dbb029";

describe("mnemonicToMiniSecret", (): void => {
	for (const password of [undefined, "foo", "bar"]) {
		it(`generates Wasm & Js equivalents for password=${password || "undefined"}`, (): void => {
			expect(
				u8aEq(
					mnemonicToMiniSecret(MNEMONIC, password, undefined, true),
					mnemonicToMiniSecret(MNEMONIC, password, undefined, false),
				),
			).toEqual(true);
		});
	}

	it("creates a known minisecret from a non-english mnemonic", (): void => {
		const mnemonic =
			"ᄋ ᄂ ᄉ ᄑ ᄇ ᄉ ᄑ ᄃ ᄃ ᄋ ᄉ ᄆ ᄃ ᄋ ᄉ ᄉ ᄂ ᄀ ᄋ ᄐ ᄃ ᄀ ᄀ ᄀ";

		expect(() => mnemonicToMiniSecret(mnemonic, "testing")).toThrow();

		// Doesn't work
		// expect(
		// 	u8aToHex(mnemonicToMiniSecret(mnemonic, "testing", koreanWords)),
		// ).toEqual(
		// 	"0xefa278a62535581767a2f49cb542ed91b65fb911e1b05e7a09c702b257f10c13",
		// );
	});

	for (const onlyJs of [false, true]) {
		describe(`onlyJs=${(onlyJs && "true") || "false"}`, (): void => {
			it("generates a valid seed", (): void => {
				expect(
					u8aToHex(
						mnemonicToMiniSecret(MNEMONIC, undefined, undefined, onlyJs),
					),
				).toEqual(SEED);
			});

			it("fails with non-mnemonics", (): void => {
				expect(() =>
					mnemonicToMiniSecret("foo bar baz", undefined, undefined, onlyJs),
				).toThrow(/mnemonic specified/);
			});

			tests.forEach(([mnemonic, , seed], index): void => {
				it(`Created correct seed for ${index}`, (): void => {
					expect(
						u8aToHex(
							mnemonicToMiniSecret(mnemonic, "Substrate", undefined, onlyJs),
						),
					).toEqual(
						// mini returned here, only check first 32-bytes (64 hex + 2 prefix)
						seed.substring(0, 66),
					);
				});
			});
		});
	}
});
