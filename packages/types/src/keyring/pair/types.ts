// Copyright 2017-2025 @polkadot/keyring authors & contributors
// SPDX-License-Identifier: Apache-2.0

export interface PairInfo {
  publicKey: Uint8Array;
  secretKey?: Uint8Array | undefined;
  seed?: Uint8Array | null;
}
