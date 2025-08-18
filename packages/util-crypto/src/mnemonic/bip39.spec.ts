// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import {
	entropyToMnemonic,
	generateMnemonic,
	mnemonicToEntropy,
	validateMnemonic,
} from "./bip39.js";
import * as lists from "./wordlists/index.js";

describe("wordlists", (): void => {
	for (const [lang, words] of Object.entries(lists)) {
		describe(`language ${lang}`, (): void => {
			it("has the correct number of words", (): void => {
				expect(words).toHaveLength(2048);
			});

			it("has no empty words", (): void => {
				expect(words.some((w) => !w.length || w.trim() !== w)).toEqual(false);
			});
		});
	}
});

describe("bip39", (): void => {
	const m =
		"seed sock milk update focus rotate barely fade car face mechanic mercy";
	const e = mnemonicToEntropy(m);

	it("generates a known entropy", (): void => {
		expect(e).toEqual(
			new Uint8Array([
				194, 249, 194, 50, 119, 69, 163, 120, 68, 162, 142, 34, 74, 50, 40, 197,
			]),
		);
	});

	it("has a two-way entropy <-> mnemonic (default wordlist)", (): void => {
		expect(entropyToMnemonic(mnemonicToEntropy(entropyToMnemonic(e)))).toEqual(
			m,
		);
	});

	for (const [lang, words] of Object.entries(lists)) {
		const isUsingList = (test: string, length = 12): void => {
			const split = test.split(" ");

			expect(split).toHaveLength(length);
			expect(split.some((w) => words.indexOf(w) === -1)).toEqual(false);
		};

		describe(`language ${lang}`, (): void => {
			it("has a two-way entropy <-> mnemonic", (): void => {
				const test = entropyToMnemonic(e, words);
				const entr = mnemonicToEntropy(test, words);

				isUsingList(test);

				expect(entr).toEqual(e);

				expect(entropyToMnemonic(entr, words)).toEqual(test);
			});

			it("generates a valid mnemonic", (): void => {
				const test = generateMnemonic(24, words);

				isUsingList(test, 24);

				expect(validateMnemonic(test, words)).toEqual(true);
			});
		});
	}
});
