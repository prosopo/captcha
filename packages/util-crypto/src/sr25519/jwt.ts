// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { stringToU8a, u8aToHex, u8aToString, u8aToU8a } from "@polkadot/util";
import { sign } from "@scure/sr25519";
import { base64URLEncode } from "../base64/bs64.js";
import type { JWT, JWTHeader, Keypair } from "../types.js";

/**
 * @name sr25519jwtIssue
 * @description Get a JWT signature using the provided secretKey (64 bytes from sr25519PairFromSeed)
 */
export function sr25519jwtIssue(
	{ publicKey, secretKey }: Partial<Keypair>,
	options?: { expiresIn?: number; notBefore?: number },
): JWT {
	const secretKeyU8a = u8aToU8a(secretKey);

	if (secretKeyU8a.length !== 64) {
		throw new Error(
			`Expected secretKey to be 64 bytes, found ${secretKeyU8a.length}`,
		);
	}

	const header: JWTHeader = { alg: "sr25519", typ: "JWT" };
	const now = options?.notBefore
		? Math.floor(options.notBefore)
		: Math.floor(Date.now() / 1000);
	const payload = {
		sub: u8aToHex(publicKey),
		iat: now,
		exp: now + (options?.expiresIn ? Math.floor(options.expiresIn) : 300), // Passed in expiry or 5 min lifetime
	};

	const signingInput = `${base64URLEncode(JSON.stringify(header))}.${base64URLEncode(JSON.stringify(payload))}`;

	const sig = sign(secretKeyU8a, stringToU8a(signingInput));
	return `${signingInput}.${base64URLEncode(sig)}` as JWT;
}
