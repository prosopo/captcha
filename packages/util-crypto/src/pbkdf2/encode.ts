// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { pbkdf2 as pbkdf2Js } from "@noble/hashes/pbkdf2";
import { sha512 } from "@noble/hashes/sha512";

import { hasBigInt, u8aToU8a } from "@polkadot/util";

import { randomAsU8a } from "../random/asU8a.js";

interface Result {
	password: Uint8Array;
	rounds: number;
	salt: Uint8Array;
}

export function pbkdf2Encode(
	passphrase?: string | Uint8Array,
	salt: Uint8Array = randomAsU8a(),
	rounds = 2048,
	onlyJs?: boolean,
): Result {
	const u8aPass = u8aToU8a(passphrase);
	const u8aSalt = u8aToU8a(salt);

	return {
		password: pbkdf2Js(sha512, u8aPass, u8aSalt, { c: rounds, dkLen: 64 }),
		rounds,
		salt,
	};
}
