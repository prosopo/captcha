// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { sshash } from "./sshash.js";

export function checkAddressChecksum(
	decoded: Uint8Array,
): [boolean, number, number, number] {
	if (decoded[0] === undefined) {
		throw new Error("Invalid address: first byte cannot be undefined");
	}
	if (decoded[1] === undefined) {
		throw new Error("Invalid address: second byte cannot be undefined");
	}

	const ss58Length = decoded[0] & 0b0100_0000 ? 2 : 1;
	const ss58Decoded =
		ss58Length === 1
			? decoded[0]
			: ((decoded[0] & 0b0011_1111) << 2) |
				(decoded[1] >> 6) |
				((decoded[1] & 0b0011_1111) << 8);

	// 32/33 bytes public + 2 bytes checksum + prefix
	const isPublicKey = [34 + ss58Length, 35 + ss58Length].includes(
		decoded.length,
	);
	const length = decoded.length - (isPublicKey ? 2 : 1);

	// calculate the hash and do the checksum byte checks
	const hash = sshash(decoded.subarray(0, length));
	const isValid =
		(decoded[0] & 0b1000_0000) === 0 &&
		![46, 47].includes(decoded[0]) &&
		(isPublicKey
			? decoded[decoded.length - 2] === hash[0] &&
				decoded[decoded.length - 1] === hash[1]
			: decoded[decoded.length - 1] === hash[0]);

	return [isValid, length, ss58Length, ss58Decoded];
}
