// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { Keypair } from "../types.js";
import type { DeriveJunction } from "./DeriveJunction.js";

export function createSeedDeriveFn(
	fromSeed: (seed: Uint8Array) => Keypair,
	derive: (seed: Uint8Array, chainCode: Uint8Array) => Uint8Array,
): (keypair: Keypair, junction: DeriveJunction) => Keypair {
	return (keypair: Keypair, { chainCode, isHard }: DeriveJunction): Keypair => {
		if (!isHard) {
			throw new Error("A soft key was found in the path and is not supported");
		}

		return fromSeed(derive(keypair.secretKey.subarray(0, 32), chainCode));
	};
}
