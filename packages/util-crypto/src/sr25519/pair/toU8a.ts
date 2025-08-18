// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { Keypair } from "../../types.js";

import { u8aConcat } from "@polkadot/util";

export function sr25519KeypairToU8a({
	publicKey,
	secretKey,
}: Keypair): Uint8Array {
	return u8aConcat(secretKey, publicKey).slice();
}
