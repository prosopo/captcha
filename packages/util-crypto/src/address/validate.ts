// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { Prefix } from "./types.js";

import { decodeAddress } from "./decode.js";

export function validateAddress(
	encoded?: string | null,
	ignoreChecksum?: boolean,
	ss58Format?: Prefix,
): encoded is string {
	return !!decodeAddress(encoded, ignoreChecksum, ss58Format);
}
