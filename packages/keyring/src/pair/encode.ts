// Copyright 2017-2025 @polkadot/keyring authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { u8aConcat } from "@polkadot/util";
import type { PairInfo } from "@prosopo/types";
import { naclEncrypt, scryptEncode, scryptToU8a } from "@prosopo/util-crypto";

import { PAIR_DIV, PAIR_HDR } from "./defaults.js";

/**
 * Encode a pair with the latest generation format (generation 3)
 **/
export function encodePair(
	{ publicKey, secretKey }: PairInfo,
	passphrase?: string,
): Uint8Array {
	if (!secretKey) {
		throw new Error("Expected a valid secretKey to be passed to encode");
	}

	const encoded = u8aConcat(PAIR_HDR, secretKey, PAIR_DIV, publicKey);

	if (!passphrase) {
		return encoded;
	}

	// this is only for generation 3 (previous generations are only handled in decoding)
	const { params, password, salt } = scryptEncode(passphrase);
	const { encrypted, nonce } = naclEncrypt(encoded, password.subarray(0, 32));

	return u8aConcat(scryptToU8a(salt, params), nonce, encrypted);
}
