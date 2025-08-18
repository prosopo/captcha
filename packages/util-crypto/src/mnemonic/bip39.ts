// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

// Adapted from the bitcoinjs/bip39 source
// https://github.com/bitcoinjs/bip39/blob/1d063b6a6aee4145b34d701037cd3e67f5446ff9/ts_src/index.ts
// Copyright (c) 2014, Wei Lu <luwei.here@gmail.com> and Daniel Cousens <email@dcousens.com>
// ISC Licence
//
// Change made in this version -
//   - Adjust formatting (just eslint differences)
//   - Only English wordlist (this aligns with the wasm-crypto implementation)
//   - Use util-crypto randomAsU8a (instead of randombytes)
//   - Remove setting of wordlist passing of wordlist in functions
//   - Remove mnemonicToSeed (we only use the sync variant)
//   - generateMnemonic takes number of words (instead of strength)

import { stringToU8a, u8aToU8a } from "@polkadot/util";
import { pbkdf2Encode } from "../pbkdf2/index.js";
import { randomAsU8a } from "../random/index.js";
import { sha256AsU8a } from "../sha/index.js";
import DEFAULT_WORDLIST from "./wordlists/en.js";

const INVALID_MNEMONIC = "Invalid mnemonic";
const INVALID_ENTROPY = "Invalid entropy";
const INVALID_CHECKSUM = "Invalid mnemonic checksum";

/** @internal */
function normalize(str?: string): string {
	return (str || "").normalize("NFKD");
}

/** @internal */
function binaryToByte(bin: string): number {
	return Number.parseInt(bin, 2);
}

/** @internal */
function bytesToBinary(bytes: number[]): string {
	return bytes.map((x) => x.toString(2).padStart(8, "0")).join("");
}

/** @internal */
function deriveChecksumBits(entropyBuffer: Uint8Array): string {
	return bytesToBinary(Array.from(sha256AsU8a(entropyBuffer))).slice(
		0,
		(entropyBuffer.length * 8) / 32,
	);
}

export function mnemonicToSeedSync(
	mnemonic: string,
	password?: string,
): Uint8Array {
	return pbkdf2Encode(
		stringToU8a(normalize(mnemonic)),
		stringToU8a(`mnemonic${normalize(password)}`),
	).password;
}

export function mnemonicToEntropy(
	mnemonic: string,
	wordlist: string[] = DEFAULT_WORDLIST,
): Uint8Array {
	const words = normalize(mnemonic).split(" ");

	if (words.length % 3 !== 0) {
		throw new Error(INVALID_MNEMONIC);
	}

	// convert word indices to 11 bit binary strings
	const bits = words
		.map((word): string => {
			const index = wordlist.indexOf(word);

			if (index === -1) {
				throw new Error(INVALID_MNEMONIC);
			}

			return index.toString(2).padStart(11, "0");
		})
		.join("");

	// split the binary string into ENT/CS
	const dividerIndex = Math.floor(bits.length / 33) * 32;
	const entropyBits = bits.slice(0, dividerIndex);
	const checksumBits = bits.slice(dividerIndex);

	// calculate the checksum and compare
	const matched = entropyBits.match(/(.{1,8})/g);
	const entropyBytes = matched?.map(binaryToByte);

	if (
		!entropyBytes ||
		entropyBytes.length % 4 !== 0 ||
		entropyBytes.length < 16 ||
		entropyBytes.length > 32
	) {
		throw new Error(INVALID_ENTROPY);
	}

	const entropy = u8aToU8a(entropyBytes);

	if (deriveChecksumBits(entropy) !== checksumBits) {
		throw new Error(INVALID_CHECKSUM);
	}

	return entropy;
}

export function entropyToMnemonic(
	entropy: Uint8Array,
	wordlist: string[] = DEFAULT_WORDLIST,
): string {
	// 128 <= ENT <= 256
	if (entropy.length % 4 !== 0 || entropy.length < 16 || entropy.length > 32) {
		throw new Error(INVALID_ENTROPY);
	}

	const matched =
		`${bytesToBinary(Array.from(entropy))}${deriveChecksumBits(entropy)}`.match(
			/(.{1,11})/g,
		);
	const mapped = matched?.map((b) => wordlist[binaryToByte(b)]);

	if (!mapped || mapped.length < 12) {
		throw new Error("Unable to map entropy to mnemonic");
	}

	return mapped.join(" ");
}

export function generateMnemonic(
	numWords: 12 | 15 | 18 | 21 | 24,
	wordlist?: string[],
): string {
	return entropyToMnemonic(randomAsU8a((numWords / 3) * 4), wordlist);
}

export function validateMnemonic(
	mnemonic: string,
	wordlist?: string[],
): boolean {
	try {
		mnemonicToEntropy(mnemonic, wordlist);
	} catch {
		return false;
	}

	return true;
}
