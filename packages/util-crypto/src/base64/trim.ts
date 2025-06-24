// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

/**
 * @name base64Trim
 * @description Trims padding characters
 */
export function base64Trim(value: string): string {
	while (value.length && value.endsWith("=")) {
		value = value.slice(0, -1);
	}

	return value;
}
