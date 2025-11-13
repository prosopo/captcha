// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { u8aToU8a } from "@polkadot/util";
import { verify } from "@scure/sr25519";

/**
 * @name sr25519Verify
 * @description Verifies the signature of `message`, using the supplied pair
 */
export function sr25519Verify(
	message: string | Uint8Array,
	signature: string | Uint8Array,
	publicKey: string | Uint8Array,
): boolean {
	const messageU8a = u8aToU8a(message);
	const signatureU8a = u8aToU8a(signature);
	const publicKeyU8a = u8aToU8a(publicKey);

	if (publicKeyU8a.length !== 32) {
		throw new Error("Invalid publicKey length, expected 32 bytes");
	}
	if (signatureU8a.length !== 64) {
		throw new Error("Invalid signature length, expected 64 bytes");
	}

	return verify(messageU8a, signatureU8a, publicKeyU8a);
}
