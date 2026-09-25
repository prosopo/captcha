// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { hexToU8a, u8aEq, u8aToString, u8aToU8a } from "@polkadot/util";
import { base64URLDecode } from "../base64/bs64.js";
import { signatureVerify } from "../signature/index.js";
import type {
	JWT,
	JWTHeader,
	JWTPayload,
	JWTVerifyOptions,
	JWTVerifyResult,
} from "../types.js";

const audienceMatches = (aud: unknown, accepted: string[]): boolean => {
	const claimed = Array.isArray(aud) ? aud : [aud];
	return claimed.some(
		(value) => typeof value === "string" && accepted.includes(value),
	);
};

export const jwtVerify = (
	jwt: JWT,
	publicKey: Uint8Array,
	options?: JWTVerifyOptions,
): JWTVerifyResult => {
	const parts = jwt.split(".");
	if (parts.length !== 3) {
		throw new Error("Invalid JWT format (expected 3 parts)");
	}

	const [headerPart, payloadPart, sigPart] = parts;
	if (!headerPart || !payloadPart || !sigPart) {
		throw new Error("Invalid JWT format (empty part)");
	}

	let header: JWTHeader;
	let payload: JWTPayload;
	try {
		header = JSON.parse(u8aToString(base64URLDecode(headerPart)));
		payload = JSON.parse(u8aToString(base64URLDecode(payloadPart)));
	} catch (e) {
		throw new Error("Invalid JWT format (cannot parse header/payload JSON)");
	}

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
	if (
		options?.maxLifetimeSeconds !== undefined &&
		exp - iat > options.maxLifetimeSeconds
	) {
		return {
			isValid: false,
			error: "JWT lifetime exceeds the allowed maximum",
			crypto: header.alg,
			publicKey,
			isWrapped: false,
		};
	}
	if (options?.audience !== undefined) {
		const { aud } = payload;
		if (aud === undefined) {
			if (options.requireAudience) {
				return {
					isValid: false,
					error: "JWT has no audience",
					crypto: header.alg,
					publicKey,
					isWrapped: false,
				};
			}
		} else if (!audienceMatches(aud, options.audience)) {
			return {
				isValid: false,
				error: "JWT audience does not match",
				crypto: header.alg,
				publicKey,
				isWrapped: false,
			};
		}
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

	// signatureVerify itself already returns { isValid, isWrapped, crypto, publicKey, error? }
	return {
		...signatureVerify(
			`${headerPart}.${payloadPart}`,
			signature,
			u8aToU8a(publicKey),
		),
		payload: payload,
	};
};
