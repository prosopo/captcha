// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { EncryptedJsonEncoding, EncryptedJsonVersion } from "./types.js";

export const ENCODING: EncryptedJsonEncoding[] = [
	"scrypt",
	"xsalsa20-poly1305",
];
export const ENCODING_NONE: EncryptedJsonEncoding[] = ["none"];
export const ENCODING_VERSION: EncryptedJsonVersion = "3";

export const NONCE_LENGTH = 24;
export const SCRYPT_LENGTH = 32 + 3 * 4;
