// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { Keypair } from "../../types.js";

import { secp256k1 } from "@noble/curves/secp256k1";

/**
 * @name secp256k1PairFromSeed
 * @description Returns a object containing a `publicKey` & `secretKey` generated from the supplied seed.
 */
export function secp256k1PairFromSeed(
	seed: Uint8Array,
	onlyJs?: boolean,
): Keypair {
	if (seed.length !== 32) {
		throw new Error("Expected valid 32-byte private key as a seed");
	}

	return {
		publicKey: secp256k1.getPublicKey(seed, true),
		secretKey: seed,
	};
}
