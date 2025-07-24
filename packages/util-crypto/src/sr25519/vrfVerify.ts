// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { u8aToU8a } from "@polkadot/util";
import { vrf } from "@scure/sr25519";

const EMPTY_U8A = new Uint8Array();

/**
 * @name sr25519VrfVerify
 * @description Verify with sr25519 vrf verification
 */
export function sr25519VrfVerify(
	message: string | Uint8Array,
	signOutput: string | Uint8Array,
	publicKey: string | Uint8Array,
	context: string | Uint8Array = EMPTY_U8A,
	extra: string | Uint8Array = EMPTY_U8A,
): boolean {
	const messageU8a = u8aToU8a(message);
	const signatureU8a = u8aToU8a(signOutput);
	const publicKeyU8a = u8aToU8a(publicKey);
	const contextU8a = u8aToU8a(context);
	const extraU8a = u8aToU8a(extra);

	if (publicKeyU8a.length !== 32) {
		throw new Error("Invalid publicKey length, expected 32 bytes");
	}
	if (signatureU8a.length !== 96) {
		throw new Error("Invalid vrfSign output length, expected 96 bytes");
	}

	return vrf.verify(
		messageU8a,
		signatureU8a,
		publicKeyU8a,
		contextU8a,
		extraU8a,
	);
}
