// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { stringToU8a, u8aToHex, u8aToU8a } from "@polkadot/util";
import { sign } from "@scure/sr25519";
import { base64URLEncode } from "../base64/bs64.js";
import type { JWT, JWTHeader, JWTPayload, Keypair } from "../types.js";

/**
 * @name sr25519jwtIssue
 * @description Get a JWT signature using the provided secretKey (64 bytes from sr25519PairFromSeed)
 */
export function sr25519jwtIssue(
	{ publicKey, secretKey }: Partial<Keypair>,
	options?: { expiresIn?: number; notBefore?: number },
	message?: { [key: string]: string },
): JWT {
	const secretKeyU8a = u8aToU8a(secretKey);

	if (secretKeyU8a.length !== 64) {
		throw new Error(
			`Expected secretKey to be 64 bytes, found ${secretKeyU8a.length}`,
		);
	}

	const header: JWTHeader = { alg: "sr25519", typ: "JWT" };
	const now = Math.floor(Date.now() / 1000);
	const nbf = options?.notBefore ? Math.floor(options.notBefore) : now;

	const payload = {
		sub: u8aToHex(publicKey),
		iat: now,
		nbf: nbf,
		exp: now + (options?.expiresIn ? Math.floor(options.expiresIn) : 300), // Passed in expiry or 5 min lifetime
		...message,
	};

	const signingInput = `${base64URLEncode(JSON.stringify(header))}.${base64URLEncode(JSON.stringify(payload))}`;

	const sig = sign(secretKeyU8a, stringToU8a(signingInput));
	return `${signingInput}.${base64URLEncode(sig)}` as JWT;
}

/**
 * @name jwtParts
 * @description Split a JWT into its constituent parts
 */
export function sr25519jwtParts(jwt: JWT) {
	const parts = jwt.split(".");
	if (parts.length !== 3) {
		throw new Error(
			`Invalid JWT format, expected 3 parts, found ${parts.length}`,
		);
	}
	if (!parts[0] || !parts[1] || !parts[2]) {
		throw new Error("Invalid JWT format, parts cannot be empty");
	}

	const header: JWTHeader = JSON.parse(
		Buffer.from(parts[0], "base64url").toString(),
	);
	const payload: JWTPayload = JSON.parse(
		Buffer.from(parts[1], "base64url").toString(),
	);
	const signature = Buffer.from(parts[2], "base64url").toString("hex");

	return {
		header,
		payload,
		signature,
	};
}
