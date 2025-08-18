// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { JWT, VerifyResult } from "../types.js";

import { u8aToU8a } from "@polkadot/util";

import { signatureVerify } from "../signature/index.js";

export const jwtVerify = (jwt: JWT, publicKey: Uint8Array): VerifyResult => {
	const parts = jwt.split(".");
	if (parts.length !== 3) {
		throw new Error("Invalid JWT format");
	}

	const signingInput = `${parts[0]}.${parts[1]}`;
	const signature = u8aToU8a(parts[2]);

	if (!signature || signature.length === 0) {
		throw new Error("Missing signature in JWT");
	}

	const publicKeyU8a = u8aToU8a(publicKey);

	return signatureVerify(signingInput, signature, publicKeyU8a);
};
