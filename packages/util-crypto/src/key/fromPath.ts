// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { Keypair, KeypairType } from "../types.js";
import type { DeriveJunction } from "./DeriveJunction.js";

import { keyHdkdSr25519 } from "./hdkdSr25519.js";

const generators = {
	sr25519: keyHdkdSr25519,
	ecdsa: () => {
		throw new Error("ECDSA key derivation not implemented yet");
	},
	ed25519: () => {
		throw new Error("ED25519 key derivation not implemented yet");
	},
	ethereum: () => {
		throw new Error("Ethereum key derivation not implemented yet");
	},
};

export function keyFromPath(
	pair: Keypair,
	path: DeriveJunction[],
	type: KeypairType,
): Keypair {
	if (!type) {
		throw new Error("Invalid type provided");
	}

	if (!generators[type]) {
		throw new Error(`Unsupported keypair type: ${type}`);
	}

	const keyHdkd = generators[type];
	let result = pair;
	for (const junction of path) {
		result = keyHdkd(result, junction);
	}

	return result;
}
