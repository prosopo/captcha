// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { hasBigInt } from "@polkadot/util";

import { mnemonicToSeedSync } from "./bip39.js";
import { mnemonicValidate } from "./validate.js";

/**
 * @name mnemonicToLegacySeed
 * @summary Creates a valid Ethereum/Bitcoin-compatible seed from a mnemonic input
 * @example
 * <BR>
 *
 * ```javascript
 * import { mnemonicGenerate, mnemonicToLegacySeed, mnemonicValidate } from '@polkadot/util-crypto';
 *
 * const mnemonic = mnemonicGenerate(); // => string
 * const isValidMnemonic = mnemonicValidate(mnemonic); // => boolean
 *
 * if (isValidMnemonic) {
 *   console.log(`Seed generated from mnemonic: ${mnemonicToLegacySeed(mnemonic)}`); => u8a
 * }
 * ```
 */
export function mnemonicToLegacySeed(
	mnemonic: string,
	password = "",
	onlyJs?: boolean,
	byteLength: 32 | 64 = 32,
): Uint8Array {
	if (!mnemonicValidate(mnemonic)) {
		throw new Error("Invalid bip39 mnemonic specified");
	}
	if (![32, 64].includes(byteLength)) {
		throw new Error(`Invalid seed length ${byteLength}, expected 32 or 64`);
	}

	return byteLength === 32
		? mnemonicToSeedSync(mnemonic, password).subarray(0, 32)
		: mnemonicToSeedSync(mnemonic, password);
}
