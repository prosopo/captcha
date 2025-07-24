// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { Keypair } from "../types.js";

import { u8aToU8a } from "@polkadot/util";
import { vrf } from "@scure/sr25519";

const EMPTY_U8A = new Uint8Array();

/**
 * @name sr25519VrfSign
 * @description Sign with sr25519 vrf signing (deterministic)
 */
export function sr25519VrfSign(
	message: string | Uint8Array,
	{ secretKey }: Partial<Keypair>,
	context: string | Uint8Array = EMPTY_U8A,
	extra: string | Uint8Array = EMPTY_U8A,
): Uint8Array {
	const messageU8a = u8aToU8a(message);
	const secretKeyU8a = u8aToU8a(secretKey);
	const contextU8a = u8aToU8a(context);
	const extraU8a = u8aToU8a(extra);

	if (secretKeyU8a.length !== 64) {
		throw new Error("Invalid secretKey length, expected 64 bytes");
	}

	// Call scure's vrf.sign with defaults for ctx, extra, rng
	// @ts-ignore - random bytes are assigned by @scure/sr25519
	return vrf.sign(messageU8a, secretKeyU8a, contextU8a, extraU8a);
}
