// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { mnemonicToEntropy as jsToEntropy } from "./bip39.js";

export function mnemonicToEntropy(
	mnemonic: string,
	wordlist?: string[],
	onlyJs?: boolean,
): Uint8Array {
	return jsToEntropy(mnemonic, wordlist);
}
