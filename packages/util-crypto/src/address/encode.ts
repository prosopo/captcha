// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { Prefix } from "./types.js";

// Original implementation: https://github.com/paritytech/polka-ui/blob/4858c094684769080f5811f32b081dd7780b0880/src/polkadot.js#L34
import { u8aConcat } from "@polkadot/util";

import { base58Encode } from "../base58/index.js";
import { decodeAddress } from "./decode.js";
import { defaults } from "./defaults.js";
import { sshash } from "./sshash.js";

export function encodeAddress(
	key: string | Uint8Array,
	ss58Format: Prefix = defaults.prefix,
): string {
	// decode it, this means we can re-encode an address
	const u8a = decodeAddress(key);

	if (ss58Format < 0 || ss58Format > 16383 || [46, 47].includes(ss58Format)) {
		throw new Error("Out of range ss58Format specified");
	}
	if (!defaults.allowedDecodedLengths.includes(u8a.length)) {
		throw new Error(
			`Expected a valid key to convert, with length ${defaults.allowedDecodedLengths.join(", ")}`,
		);
	}

	const input = u8aConcat(
		ss58Format < 64
			? [ss58Format]
			: [
					((ss58Format & 0b0000_0000_1111_1100) >> 2) | 0b0100_0000,
					(ss58Format >> 8) | ((ss58Format & 0b0000_0000_0000_0011) << 6),
				],
		u8a,
	);

	return base58Encode(
		u8aConcat(
			input,
			sshash(input).subarray(0, [32, 33].includes(u8a.length) ? 2 : 1),
		),
	);
}
