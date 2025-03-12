// Copyright 2021-2025 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { sha256 } from "@noble/hashes/sha256";

const u8aToBi = (bytes: Uint8Array): bigint => {
	let value = 0n;
	for (let i = 0; i < bytes.length; i++) {
		value <<= 8n;
		value |= BigInt(bytes[i]!);
	}
	return value;
}

/**
 * Convert bigint to u8 array
 * @param value the big int to convert to a u8 array
 * @returns u8 array
 */
const biToU8a = (value: bigint, bigEndian?: boolean, width?: number): Uint8Array => {
	width = width || 0
	const chunks: number[] = [];
	const exponent = 8n;
	const mask = 2n ** exponent - 1n; // 255, all bits set
	while (value > 0n) {
		const chunk = value & mask
		chunks.push(Number(chunk));
		value >>= exponent;
	}
	if(chunks.length > width) {
		throw new Error("Value is too large")
	}
	while(chunks.length < width) {
		chunks.push(0);
	}
	return new Uint8Array(bigEndian ? chunks.reverse() : chunks);
}

// TODO endianess
const compareU8a = (a: Uint8Array, b: Uint8Array): 1 | 0 | -1 => {
	if (a.length !== b.length) {
		throw new Error("Arrays are not the same length");
	}
	for (let i = 0; i < a.length; i++) {
		if (a[i]! > b[i]!) {
			return 1;
		}
		if (a[i]! < b[i]!) {
			return -1;
		}
	}
	return 0;
}

/**
 * Solve a Proof of Work (PoW) puzzle
 * @param data the data to hash
 * @param difficulty the threshold which a hash must be greater than to solve the PoW
 */
export const solvePoW = (data: string, difficulty: bigint, maxTime: number): bigint | undefined => {
	const now = Date.now();
	// example:
	// take a payload (data + nonce) and hash it, producing a hash
	// let's say the hash in bytes is [2, 99, 32]
	// the difficulty translates into a threshold
	// let's say the difficulty is 300, which is [1, 44] in bytes (300 = 1*256 + 44 = 300)
	// 300 in binary is 0b100101100
	// the hash must be less than the threshold to solve the PoW
	// in this case, [2, 99] are extracted from the hash, and compared to the threshold
	// [2, 99] is 2*256 + 99 = 611
	// 611 in binary is 0b1001100011
	// compare binaries:
	// 300 -> 0b0100101100
	// 611 -> 0b1001100011
	// 611 is larger than 300, so the PoW is not solved
	// increment the nonce and hash again produces [1, 13], say, which is 1*256 + 13 = 269
	// 269 is less than 300, so the PoW is solved

	// this is similar to the classic pow difficulty, except that was an exponent of 2.
	// e.g. if the difficulty was 8, 2^8 = 256, so the hash must be less than 256 to solve the PoW
	// all we're doing here is specifying the threshold directly rather than as an exponent of 2

	// note that we're working in big endian format so binary representations can be compared directly

	// the hash is checked in 4-byte chunks (u32), so split the threshold into 4-byte chunks
	// this is the equivalent of representing the difficulty in base 2^32

	// big endian format for integer comparison against the hash
	const threshold = 2n ** 256n - 1n - difficulty;
	const thresholdU8a = biToU8a(threshold, true, 32);

	// convert the data to bytes
	const dataBytes = new TextEncoder().encode(data);

	// the nonce is appended to the data to create the payload
	// the nonce can be any length of bytes
	// there is situations where the number of nonce bytes is not large enough to solve the pow
	// e.g. nonce of size 1 byte can try nonce's from 0-255, but all of these may not solve the pow
	// therefore, we'll keep adding a byte to the nonce until the pow is solved
	// note that sha256 hashing is payload length sensitive, so the same nonce value in different byte lengths will produce different hashes
	// e.g. the data is [1,2,3] in bytes. A nonce of [0] (as int === 0) would make the payload [0,1,2,3], producing a hash of 0x123...
	// e.g. the data is [1,2,3] in bytes. A nonce of [0, 0] (as int === 0) would make the payload [0,0,1,2,3], producing a hash of 0x456...
	// therefore, nonces with the same integer value but different byte lengths will produce different hashes and are *crucially* different
	let nonceSizeBytes = 0;
	while (true) {
		// add 1 to the nonce size
		nonceSizeBytes++;
		// console.log(`Trying nonce size: ${nonceSizeBytes}`)
		// create a new nonce with the new size
		const nonceBytes = new Uint8Array(nonceSizeBytes);
		// concat the data and nonce
		const dataAndNonce = new Uint8Array(dataBytes.length + nonceBytes.length);
		dataAndNonce.set(nonceBytes)
		dataAndNonce.set(dataBytes, nonceBytes.length)

		let nonceExhausted = false;
		while (!nonceExhausted) {
			// hash the data and nonce
			const hash = sha256(dataAndNonce);
			// check if the hash meets the difficulty
			const comparison = compareU8a(hash, thresholdU8a);
			if (comparison < 0) {
				// if the hash meets the difficulty, return the nonce
				// convert the nonce bytes to string
				return u8aToBi(dataAndNonce.slice(0, nonceBytes.length)); // TODO check the endianess
			}
			// check max time
			if (Date.now() - now > maxTime) {
				return undefined;
			}
			// else try a different nonce, i.e. inc the nonce
			nonceExhausted = true;
			for (let i = 0; i < nonceBytes.length; i++) {
				if (dataAndNonce[i]! < 255) {
					dataAndNonce[i]!++;
					// being able to increment a byte means the nonce is not exhausted
					// when all nonce bytes are 255, e.g. [255, 255], we won't hit this condition, so the nonce is exhausted
					nonceExhausted = false;
					break;
				} else {
					// byte wraps around to 0
					dataAndNonce[i] = 0;
				}
			}
		}
	}
};

const main = async () => {
	const data = "hello world";
	// chars are 8 bits
	// old version used to specify 3-5 chars, so 24-40 bits
	// for (let i = 0; i < 256; i++) {
	// 	i = 255
	// 	// const difficulty = 2n ** BigInt(i);
	// 	// const difficulty = 257n;
	// 	const difficulty = (2n ** BigInt(128) - 1n);
	// 	console.log(`Trying difficulty: ${difficulty} , ${i} bits`);
	// 	const now = Date.now();
	// 	const nonce = solvePoW(data, difficulty);
	// 	const elapsed = Date.now() - now;
	// 	console.log(`nonce: ${nonce} in ${elapsed}ms`);
	// }

	// let min = 0n;
	// let max = 2n ** 256n - 1n;
	// const maxTime = 10000 // 1min

	// // binary search to find the difficulty which takes my pc ~1min to solve
	// while (max - min > 1n) {
	// 	const mid = min + (max - min) / 2n;
	// 	console.log(`Trying difficulty: ${mid}`);
	// 	const now = Date.now();
	// 	const nonce = solvePoW(data, mid, maxTime);
	// 	const elapsed = Date.now() - now;
	// 	console.log(`nonce: ${nonce} in ${elapsed}ms`);
	// 	if (nonce === undefined) {
	// 		max = mid;
	// 	} else {
	// 		min = mid;
	// 	}
	// }

	// const a1 = biToU8a(300n, true, 4)
	// const a2 = biToU8a(2n ** 32n - 257n, true, 4)
	// const a3 = biToU8a(2n ** 32n - 256n, true, 4)
	// const a4 = biToU8a(2n ** 32n - 255n, true, 4)
	// const a5 = biToU8a(2n ** 32n - 254n, true, 4)

	// const a1 = compareU8a(new Uint8Array([0, 0, 1, 45]), new Uint8Array([0, 0, 1, 44]))
	// const a2 = compareU8a(new Uint8Array([0, 0, 1, 43]), new Uint8Array([0, 0, 1, 44]))
	// const a3 = compareU8a(new Uint8Array([0, 0, 1, 44]), new Uint8Array([0, 0, 1, 44]))

	// solvePoW(data, 254n, Number.POSITIVE_INFINITY)
	// solvePoW(data, 255n, Number.POSITIVE_INFINITY)
	// solvePoW(data, 256n, Number.POSITIVE_INFINITY)
	// solvePoW(data, 257n, Number.POSITIVE_INFINITY)
	// solvePoW(data, 2n ** 256n - 1n, Number.POSITIVE_INFINITY)

	// let min = 1n
	// let max = 1n
	// let mid = 1n
	// let setup = true
	// let run = true
	// const maxTime = 10000
	// let count = 0
	// while(run) {
	// 	count++
	// 	console.log(`Trying difficulty: ${mid}`);
	// 	const now = Date.now();
	// 	const nonce = solvePoW(data, mid, maxTime);
	// 	const elapsed = Date.now() - now;
	// 	console.log(`nonce: ${nonce} in ${elapsed}ms`);
	// 	if(setup) {
	// 		if(nonce !== undefined) {
	// 			min = mid
	// 			mid *= 2n
	// 			max = mid
	// 		} else {
	// 			setup = false
	// 		}
	// 	}
	// 	if(!setup) {
	// 		if(nonce === undefined) {
	// 			max = mid
	// 			mid = (max - min) / 2n + min
	// 		} else {
	// 			min = mid
	// 			mid = (max - min) / 2n + min
	// 		}
	// 	}
	// }

	// let amount = 0n
	// const maxTime = 10000
	// for(let i = 256; i >= 0; i--) {
	// 	const inc = 2n ** BigInt(i) - 1n
	// 	const diff = amount + inc
	// 	const now = Date.now();
	// 	const nonce = solvePoW(data, diff, maxTime);
	// 	const elapsed = Date.now() - now;
	// 	console.log(`${i}th diff ${diff} solved by ${nonce} in ${elapsed}ms`);
	// 	if(nonce !== undefined) {
	// 		amount = diff
	// 	}
	// }

	let diff = 115792069461391469497439717614192095521140896008391839564465112707866132898966n
	let inc = 1_000_000n
	while(true) {
		const now = Date.now();
		const nonce = solvePoW(data, diff, 10000);
		const elapsed = Date.now() - now;
		console.log(`diff ${diff} solved by ${nonce} in ${elapsed}ms`);
		if(nonce !== undefined) {
			diff += inc
		} else {
			break
		}
	}
}

main()

// TODO convert difficulty to a 0-1 threshold?
// TODO fix array access
// TODO check comments make sense
