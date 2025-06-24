// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

/**
 * @name base64Pad
 * @description Adds padding characters for correct length
 */
export function base64Pad (value: string): string {
  return value.padEnd(value.length + (value.length % 4), '=');
}
