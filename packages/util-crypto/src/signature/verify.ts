// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { KeypairType, VerifyResult } from "../types.js";

import {
	u8aIsWrapped,
	u8aToU8a,
	u8aUnwrapBytes,
	u8aWrapBytes,
} from "@polkadot/util";

import { decodeAddress } from "../address/decode.js";
import { sr25519Verify } from "../sr25519/verify.js";

interface VerifyInput {
	message: Uint8Array;
	publicKey: Uint8Array;
	signature: Uint8Array;
}

type Verifier = [
	KeypairType,
	(
		message: Uint8Array | string,
		signature: Uint8Array,
		publicKey: Uint8Array,
	) => boolean,
];

type VerifyFn = (result: VerifyResult, input: VerifyInput) => VerifyResult;

const VERIFIERS_ECDSA: Verifier[] = [
	//["ecdsa", secp256k1VerifyHasher("blake2")],
	//["ethereum", secp256k1VerifyHasher("keccak")],

	[
		"ecdsa",
		() => {
			throw new Error("Not Implemented");
		},
	],
	[
		"ethereum",
		() => {
			throw new Error("Not Implemented");
		},
	],
];

const VERIFIERS: Verifier[] = [
	//["ed25519", ed25519Verify],
	[
		"ed25519",
		() => {
			throw new Error("Not Implemented");
		},
	],
	["sr25519", sr25519Verify],
	...VERIFIERS_ECDSA,
];

const CRYPTO_TYPES: ("ed25519" | "sr25519" | "ecdsa")[] = [
	"ed25519",
	"sr25519",
	"ecdsa",
];

function verifyDetect(
	result: VerifyResult,
	{ message, publicKey, signature }: VerifyInput,
	verifiers = VERIFIERS,
): VerifyResult {
	result.isValid = verifiers.some(([crypto, verify]): boolean => {
		try {
			if (verify(message, signature, publicKey)) {
				result.crypto = crypto;

				return true;
			}
		} catch {
			// do nothing, result.isValid still set to false
		}

		return false;
	});

	return result;
}

function verifyMultisig(
	result: VerifyResult,
	{ message, publicKey, signature }: VerifyInput,
): VerifyResult {
	const sigFirstPart = signature[0];

	if (sigFirstPart === undefined) {
		throw new Error(
			"Invalid signature, expected first byte to indicate crypto type",
		);
	}

	if (![0, 1, 2].includes(sigFirstPart)) {
		throw new Error(
			`Unknown crypto type, expected signature prefix [0..2], found ${signature[0]}`,
		);
	}

	const type = CRYPTO_TYPES[sigFirstPart];

	if (!type) {
		throw new Error(`Unknown crypto type, found ${sigFirstPart}`);
	}

	result.crypto = type;

	try {
		result.isValid = {
			sr25519: () => sr25519Verify(message, signature.subarray(1), publicKey),
			ecdsa: () => false,
			ethereum: () => false,
			ed25519: () => false,
		}[type]();
	} catch {
		// ignore, result.isValid still set to false
	}

	return result;
}

function getVerifyFn(signature: Uint8Array): VerifyFn {
	const sigFirstPart = signature[0];

	if (sigFirstPart === undefined) {
		throw new Error(
			"Invalid signature, expected first byte to indicate crypto type",
		);
	}

	return [0, 1, 2].includes(sigFirstPart) && [65, 66].includes(signature.length)
		? verifyMultisig
		: verifyDetect;
}

export function signatureVerify(
	message: string | Uint8Array,
	signature: string | Uint8Array,
	addressOrPublicKey: string | Uint8Array,
): VerifyResult {
	const signatureU8a = u8aToU8a(signature);

	if (![64, 65, 66].includes(signatureU8a.length)) {
		throw new Error(
			`Invalid signature length, expected [64..66] bytes, found ${signatureU8a.length}`,
		);
	}

	const publicKey = decodeAddress(addressOrPublicKey);
	const input = {
		message: u8aToU8a(message),
		publicKey,
		signature: signatureU8a,
	};
	const result: VerifyResult = {
		crypto: "none",
		isValid: false,
		isWrapped: u8aIsWrapped(input.message, true),
		publicKey,
	};
	const isWrappedBytes = u8aIsWrapped(input.message, false);
	const verifyFn = getVerifyFn(signatureU8a);

	verifyFn(result, input);

	if (result.crypto !== "none" || (result.isWrapped && !isWrappedBytes)) {
		return result;
	}

	input.message = isWrappedBytes
		? u8aUnwrapBytes(input.message)
		: u8aWrapBytes(input.message);

	return verifyFn(result, input);
}
