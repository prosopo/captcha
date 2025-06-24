// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { EncryptedJson } from './types.js';

import { base64Encode } from '../base64/index.js';
import { ENCODING, ENCODING_NONE, ENCODING_VERSION } from './constants.js';

export function jsonEncryptFormat (encoded: Uint8Array, contentType: string[], isEncrypted: boolean): EncryptedJson {
  return {
    encoded: base64Encode(encoded),
    encoding: {
      content: contentType,
      type: isEncrypted
        ? ENCODING
        : ENCODING_NONE,
      version: ENCODING_VERSION
    }
  };
}
