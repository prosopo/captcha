// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { arrayRange, u8aEq } from "@polkadot/util";
import { describe, expect, it } from "vitest";
import {
	mnemonicGenerate,
	mnemonicToMiniSecret,
	sr25519FromSeed,
} from "../index.js";

// NOTE: This basically controls how long stuff runs for, YMMV
//
// - 100 runs with 5 checks, takes 2mins on _my_ machine
// - 10_000 runs with 5 checks should be ~3hrs
const NUM_RUNS = 10;
const NUM_CHECKS = 5;

// generate either a JS or WASM mnemonic
for (const onlyJsMnemonic of [false, true]) {
	describe(`mnemonicToMiniSecret (conpare), onlyJs${(onlyJsMnemonic && "true") || "false"}`, (): void => {
		for (const i of arrayRange(NUM_RUNS)) {
			// loop through lots of mnemonics
			describe(`run=${i + 1}`, (): void => {
				// compare both JS and WASM outputs against original
				for (const onlyJsMini of [false, true]) {
					describe(`onlyJsMini=${(onlyJsMini && "true") || "false"}`, (): void => {
						// NOTE we cannot actually use the onlyJsMnemonic flag here
						const mnemonic = mnemonicGenerate(12);

						describe(`${mnemonic}`, (): void => {
							// do iterations to check and re-check that all matches
							for (const count of arrayRange(NUM_CHECKS)) {
								it(`check=${count + 1}`, (): void => {
									const minisecret = mnemonicToMiniSecret(
										mnemonic,
										count ? `${count}` : "",
										undefined,
										onlyJsMnemonic,
									);
									const srpub = sr25519FromSeed(minisecret).publicKey;
									const testmini = mnemonicToMiniSecret(
										mnemonic,
										count ? `${count}` : "",
										undefined,
										onlyJsMini,
									);

									// explicit minisecret compare
									expect(u8aEq(minisecret, testmini)).toEqual(true);

									// compare the sr25519 keypair generated
									expect(
										u8aEq(srpub, sr25519FromSeed(testmini).publicKey),
									).toEqual(true);
								});
							}
						});
					});
				}
			});
		}
	});
}
