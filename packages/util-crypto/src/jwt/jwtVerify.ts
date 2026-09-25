// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { hexToU8a, u8aEq, u8aToString } from "@polkadot/util";
import { base64URLDecode } from "../base64/bs64.js";
import { sr25519Verify } from "../sr25519/verify.js";
import type { JWT, JWTHeader, JWTPayload, JWTVerifyResult } from "../types.js";

// The only algorithm sr25519jwtIssue (and the Rust sr25519-jwt issuer) writes.
const JWT_ALG = "sr25519";

const isPinnedAlgHeader = (header: unknown): header is JWTHeader =>
	typeof header === "object" &&
	header !== null &&
	"alg" in header &&
	header.alg === JWT_ALG;

const verifySr25519Signature = (
	signingInput: string,
	signature: Uint8Array,
	publicKey: Uint8Array,
): boolean => {
	try {
		return sr25519Verify(signingInput, signature, publicKey);
	} catch {
		return false;
	}
};

export const jwtVerify = (jwt: JWT, publicKey: Uint8Array): JWTVerifyResult => {
	const parts = jwt.split(".");
	if (parts.length !== 3) {
		throw new Error("Invalid JWT format (expected 3 parts)");
	}

	const [headerPart, payloadPart, sigPart] = parts;
	if (!headerPart || !payloadPart || !sigPart) {
		throw new Error("Invalid JWT format (empty part)");
	}

	let parsedHeader: unknown;
	let payload: JWTPayload;
	try {
		parsedHeader = JSON.parse(u8aToString(base64URLDecode(headerPart)));
		payload = JSON.parse(u8aToString(base64URLDecode(payloadPart)));
	} catch (e) {
		throw new Error("Invalid JWT format (cannot parse header/payload JSON)");
	}

	if (!isPinnedAlgHeader(parsedHeader)) {
		return {
			isValid: false,
			error: "Unsupported JWT algorithm",
			crypto: "none",
			publicKey,
			isWrapped: false,
		};
	}
	const header = parsedHeader;

	const signature = base64URLDecode(sigPart);
	if (!signature || signature.length === 0) {
		return {
			isValid: false,
			error: "Missing signature",
			crypto: header.alg,
			publicKey,
			isWrapped: false,
		};
	}

	const { exp, iat, nbf, sub } = payload;
	const now = Date.now() / 1000;

	if (typeof exp !== "number" || typeof iat !== "number") {
		return {
			isValid: false,
			error: "Invalid payload: 'exp' or 'iat' is not a number",
			crypto: header.alg,
			publicKey,
			isWrapped: false,
		};
	}
	if (exp < now) {
		return {
			isValid: false,
			error: "JWT expired",
			crypto: header.alg,
			publicKey,
			isWrapped: false,
		};
	}
	if (nbf && nbf > now) {
		return {
			isValid: false,
			error: "JWT not valid yet",
			crypto: header.alg,
			publicKey,
			isWrapped: false,
		};
	}
	const subU8a = hexToU8a(sub);
	if (!u8aEq(subU8a, publicKey)) {
		return {
			isValid: false,
			error: "Subject does not match publicKey",
			crypto: header.alg,
			publicKey,
			isWrapped: false,
		};
	}

	return {
		isValid: verifySr25519Signature(
			`${headerPart}.${payloadPart}`,
			signature,
			publicKey,
		),
		crypto: header.alg,
		publicKey,
		isWrapped: false,
		payload,
	};
};
