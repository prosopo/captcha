// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { RistrettoPoint } from "@noble/curves/ed25519";
import { bytesToNumberLE } from "@noble/curves/utils";
import { u8aToU8a } from "@polkadot/util";
import { secretFromSeed } from "@scure/sr25519";
import type { Keypair } from "../../types.js";

/**
 * @name sr25519FromSeed
 * @description Returns an object containing a `publicKey` & `secretKey` generated from the supplied seed.
 */
export function sr25519FromSeed(seed: string | Uint8Array): Keypair {
	const seedU8a = u8aToU8a(seed);
	if (seedU8a.length !== 32) {
		throw new Error(`Expected a seed of 32 bytes, found ${seedU8a.length}`);
	}
	const secretKey = secretFromSeed(seedU8a);

	const scalar = bytesToNumberLE(secretKey.subarray(0, 32)) >> 3n;
	const publicKey = RistrettoPoint.BASE.multiply(scalar).toRawBytes();

	return {
		publicKey: new Uint8Array(publicKey),
		secretKey: new Uint8Array(secretKey),
	};
}
