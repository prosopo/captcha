// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { u8aToU8a } from "@polkadot/util";
import { getSharedSecret } from "@scure/sr25519";

/**
 * @name sr25519Agreement
 * @description Key agreement between other's public key and self secret key
 */
export function sr25519Agreement(
	secretKey: string | Uint8Array,
	publicKey: string | Uint8Array,
): Uint8Array {
	const secretKeyU8a = u8aToU8a(secretKey);
	const publicKeyU8a = u8aToU8a(publicKey);

	if (publicKeyU8a.length !== 32) {
		throw new Error(
			`Invalid publicKey, received ${publicKeyU8a.length} bytes, expected 32`,
		);
	}
	if (secretKeyU8a.length !== 64) {
		throw new Error(
			`Invalid secretKey, received ${secretKeyU8a.length} bytes, expected 64`,
		);
	}

	return getSharedSecret(secretKeyU8a, publicKeyU8a);
}
