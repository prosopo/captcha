// Copyright 2017-2025 @prosopo/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { blake2b } from "@noble/hashes/blake2b";

import { u8aToU8a } from "@polkadot/util";

/**
 * @name blake2AsU8a
 * @summary Creates a blake2b u8a from the input.
 * @description
 * From a `Uint8Array` input, create the blake2b and return the result as a u8a with the specified `bitLength`.
 * @example
 * <BR>
 *
 * ```javascript
 * import { blake2AsU8a } from '@prosopo/util-crypto';
 *
 * blake2AsU8a('abc'); // => [0xba, 0x80, 0xa5, 0x3f, 0x98, 0x1c, 0x4d, 0x0d]
 * ```
 */
export function blake2AsU8a(
	data: string | Uint8Array,
	bitLength: 64 | 128 | 256 | 384 | 512 = 256,
	key?: Uint8Array | null,
): Uint8Array {
	const byteLength = Math.ceil(bitLength / 8);
	const u8a = u8aToU8a(data);

	return key
		? blake2b(u8a, { dkLen: byteLength, key })
		: blake2b(u8a, { dkLen: byteLength });
}
