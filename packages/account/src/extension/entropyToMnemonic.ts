import { sha256 } from "@noble/hashes/sha256";
import DEFAULT_WORDLIST from "./wordlists/en.js";

const INVALID_MNEMONIC = "Invalid mnemonic";
const INVALID_ENTROPY = "Invalid entropy";
const INVALID_CHECKSUM = "Invalid mnemonic checksum";

/** @internal */
function bytesToBinary(bytes: number[]): string {
	return bytes.map((x) => x.toString(2).padStart(8, "0")).join("");
}

/** @internal */
function binaryToByte(bin: string): number {
	return Number.parseInt(bin, 2);
}

/** @internal */
function deriveChecksumBits(entropyBuffer: Uint8Array): string {
	return bytesToBinary(Array.from(sha256(entropyBuffer))).slice(
		0,
		(entropyBuffer.length * 8) / 32,
	);
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
