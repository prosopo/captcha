// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { u8aToU8a } from "@polkadot/util";
import { sign } from "@scure/sr25519";
import type { Keypair } from "../types.js";

/**
 * @name sr25519Sign
 * @description Signs a message using the provided secretKey (64 bytes from sr25519PairFromSeed)
 */
export function sr25519Sign(
	message: string | Uint8Array,
	{ publicKey, secretKey }: Partial<Keypair>,
): Uint8Array {
	const msgU8a =
		typeof message === "string" ? new TextEncoder().encode(message) : message;
	const secretKeyU8a = u8aToU8a(secretKey);

	if (secretKeyU8a.length !== 64) {
		throw new Error(
			`Expected secretKey to be 64 bytes, found ${secretKeyU8a.length}`,
		);
	}
	return sign(secretKeyU8a, msgU8a);
}
