// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { mnemonicGenerate } from "./generate.js";
import { mnemonicValidate } from "./validate.js";
import { french as frenchWords } from "./wordlists/index.js";

describe("mnemonicGenerate", (): void => {
	it("generates a valid mnemonic (default strength)", (): void => {
		expect(mnemonicValidate(mnemonicGenerate())).toEqual(true);
	});

	it("generates a french mnemonic", (): void => {
		const mnemonic = mnemonicGenerate(24, frenchWords);
		const words = mnemonic.split(" ");

		expect(words).toHaveLength(24);
		expect(mnemonicValidate(mnemonic, frenchWords)).toEqual(true);
		expect(mnemonicValidate(mnemonic)).toEqual(false);
		expect(words.every((w) => frenchWords.includes(w))).toEqual(true);
	});

	for (const onlyJs of [false, true]) {
		describe(`onlyJs=${(onlyJs && "true") || "false"}`, (): void => {
			for (const num of [12, 15, 18, 21, 24] as const) {
				it(`generates a valid mnemonic (${num} words)`, (): void => {
					const mnemonic = mnemonicGenerate(num, undefined, onlyJs);
					const isValid = mnemonicValidate(mnemonic);

					expect(mnemonic.split(" ")).toHaveLength(num);
					expect(isValid).toEqual(true);
				});
			}

			it("generates non-deterministic", (): void => {
				const m1 = mnemonicGenerate(24, undefined, onlyJs);
				const m2 = mnemonicGenerate(24, undefined, onlyJs);

				expect(m1 === m2).toEqual(false);
				expect(mnemonicValidate(m1)).toEqual(true);
				expect(mnemonicValidate(m2)).toEqual(true);
			});
		});
	}
});
