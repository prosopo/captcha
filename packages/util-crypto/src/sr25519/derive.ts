// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { Keypair } from "../types.js";

import { isU8a, u8aConcat } from "@polkadot/util";

import { sr25519PairFromU8a } from "./pair/fromU8a.js";

export function createDeriveFn(
	derive: (pair: Uint8Array, cc: Uint8Array) => Uint8Array,
): (keypair: Keypair, chainCode: Uint8Array) => Keypair {
	return (keypair: Keypair, chainCode: Uint8Array): Keypair => {
		if (!isU8a(chainCode) || chainCode.length !== 32) {
			throw new Error("Invalid chainCode passed to derive");
		}

		return sr25519PairFromU8a(
			new Uint8Array([
				...keypair.publicKey,
				...derive(keypair.secretKey, chainCode),
			]),
		);
	};
}
