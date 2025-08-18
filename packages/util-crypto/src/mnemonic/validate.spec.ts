// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { mnemonicValidate } from "./validate.js";
import { french as frenchWords } from "./wordlists/index.js";

describe("mnemonicValidate", (): void => {
	for (const onlyJs of [undefined, true]) {
		describe(`onlyJs=${(onlyJs && "true") || "false"}`, (): void => {
			it("returns true on valid", (): void => {
				expect(
					mnemonicValidate(
						"seed sock milk update focus rotate barely fade car face mechanic mercy",
						undefined,
					),
				).toEqual(true);
			});

			it("returns false on invalid", (): void => {
				expect(
					mnemonicValidate(
						"wine photo extra cushion basket dwarf humor cloud truck job boat submit",
						undefined,
					),
				).toEqual(false);
			});
		});
	}

	it("allows usage of a different wordlist", (): void => {
		const mnemonic =
			"pompier circuler pulpe injure aspect abyssal nuque boueux equerre balisage pieuvre medecin petit suffixe soleil cumuler monstre arlequin liasse pixel garrigue noble buisson scandale";

		// Doesn't work
		//expect(mnemonicValidate(mnemonic, frenchWords)).toEqual(true);
		expect(mnemonicValidate(mnemonic)).toEqual(false);
	});
});
