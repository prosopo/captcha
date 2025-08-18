// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { isU8a, u8aToU8a } from "@polkadot/util";
import { HDKD } from "@scure/sr25519";

export function sr25519DerivePublic(
	publicKey: string | Uint8Array,
	chainCode: Uint8Array,
): Uint8Array {
	const publicKeyU8a = u8aToU8a(publicKey);

	if (!isU8a(chainCode) || chainCode.length !== 32) {
		throw new Error("Invalid chainCode passed to derive");
	}
	if (publicKeyU8a.length !== 32) {
		throw new Error(
			`Invalid publicKey, received ${publicKeyU8a.length} bytes, expected 32`,
		);
	}

	return HDKD.publicSoft(publicKeyU8a, chainCode);
}
