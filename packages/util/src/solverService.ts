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
 * @returns An object containing the nonce and the time taken to solve the puzzle
 */
export const solvePoW = (data: string, difficulty: number, maxTime=100000): { nonce: bigint; timeTaken: number } => {
	const now = Date.now();
	// if not in range 0-1 difficulty, throw
	if (!(0 <= difficulty && difficulty <= 1)) {
		throw new Error("Difficulty must be between 0 and 1");
	}
	const bigIntDifficulty = difficultyFromNormalizedValue(difficulty);
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
	const threshold = 2n ** 256n - 1n - bigIntDifficulty;
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
				// if the hash meets the difficulty, return the nonce and time taken
				const timeTaken = Date.now() - now;
				const nonce = u8aToBi(dataAndNonce.slice(0, nonceBytes.length)); // TODO check the endianess
				return { nonce, timeTaken };
			}
			// check max time
			if (Date.now() - now > maxTime) {
				throw new Error("Max time exceeded");
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
	// Test multiple difficulty levels with multiple trials per level
	const difficultyLevels = Array.from({ length: 21 }, (_, i) => i * 0.05); // 0, 0.05, 0.1, ..., 1.0
	const numTrials = 3; // Reduced number of trials for faster testing
	const maxTime = 10000; // Max time per trial in ms
	const results: { difficulty: number; avgTime: number }[] = [];
	const allPowResults: { difficulty: number; timeTaken: number; nonce: bigint }[] = [];

	for (const difficulty of difficultyLevels) {
		console.log(`Testing difficulty level: ${difficulty}`);
		let totalTime = 0;
		let successfulTrials = 0;
		
		for (let trial = 0; trial < numTrials; trial++) {
			// Add randomness to the data to ensure different hashes for each trial
			const data = `hello world ${Math.random().toString(36).substring(7)}`;
			const startTime = Date.now();
			
			try {
				const { nonce, timeTaken } = solvePoW(data, difficulty, maxTime);
				console.log(`  Trial ${trial + 1}: solved in ${timeTaken}ms with nonce ${nonce}`);
				totalTime += timeTaken;
				successfulTrials++;
				
				// Store individual POW result
				allPowResults.push({ difficulty, timeTaken, nonce });
			} catch (error) {
				console.log(`  Trial ${trial + 1}: max time exceeded`);
				// If we can't solve it within the time limit, we'll stop testing this difficulty level
				break;
			}
		}
		
		if (successfulTrials > 0) {
			const avgTime = totalTime / successfulTrials;
			results.push({ difficulty, avgTime });
			console.log(`Difficulty ${difficulty}: Average time ${avgTime.toFixed(2)}ms over ${successfulTrials} trials`);
		} else {
			console.log(`Difficulty ${difficulty}: Could not solve within time limit`);
			// If we can't solve any trials at this difficulty, we'll stop testing higher difficulties
			break;
		}
	}
	
	// Output the final results as a table
	console.log("\nFinal Results:");
	console.log("Difficulty | Average Time (ms)");
	console.log("------------------------");
	for (const result of results) {
		console.log(`${result.difficulty.toFixed(2).padStart(10)} | ${result.avgTime.toFixed(2).padStart(10)}`);
	}

	// Generate CSV output for plotting
	console.log("\nCSV Data for Plotting:");
	console.log("difficulty,avgTime");
	for (const result of results) {
		console.log(`${result.difficulty},${result.avgTime}`);
	}

	// Output all individual POW results
	console.log("\nAll POW Results:");
	console.log("difficulty,timeTaken,nonce");
	for (const result of allPowResults) {
		console.log(`${result.difficulty},${result.timeTaken},${result.nonce}`);
	}

	// Create a simple ASCII chart
	console.log("\nASCII Chart (log scale):");
	console.log("Difficulty | Time (ms) | Chart (each * = ~5% of max)");
	console.log("------------------------------------------------");
	
	// Find the maximum time for scaling
	const maxAvgTime = Math.max(...results.map(r => r.avgTime));
	
	// Use log scale for better visualization
	for (const result of results) {
		// Calculate the number of stars to display (log scale)
		const logScale = Math.log(result.avgTime + 1) / Math.log(maxAvgTime + 1);
		const numStars = Math.round(logScale * 20); // 20 stars max
		const stars = '*'.repeat(numStars);
		
		console.log(`${result.difficulty.toFixed(2).padStart(10)} | ${result.avgTime.toFixed(2).padStart(9)} | ${stars}`);
	}
}

/**
 * Convert a normalized value (0-1) to a difficulty value in the specified range using a logarithmic scale
 * @param normalizedValue A number between 0 and 1 (inclusive)
 * @returns A bigint difficulty value
 */
export const difficultyFromNormalizedValue = (normalizedValue: number): bigint => {
	// Validate input
	if (normalizedValue < 0 || normalizedValue > 1) {
		throw new Error("Normalized value must be between 0 and 1");
	}

	// Define our difficulty range
	const minDifficulty = 115787368442814990677940379635678110367860508107103599495053852841344050922469n;
	const maxDifficulty = 115791993805572251109631470458973827890575769264982743614897639476041363751909n;
	const difficultyRange = maxDifficulty - minDifficulty;

	// Apply logarithmic scaling
	// Using a logarithmic function where:
	// - normalizedValue = 0 maps to minDifficulty
	// - normalizedValue = 1 maps to maxDifficulty
	// - normalizedValue = 0.5 maps to a value much closer to maxDifficulty than minDifficulty
	
	// We'll use the formula: minDifficulty + difficultyRange * (1 - Math.exp(-k * normalizedValue)) / (1 - Math.exp(-k))
	// where k is a constant that determines how logarithmic the scale is (higher k = more logarithmic)
	const k = 8; // This can be adjusted to change the logarithmic curve
	
	// Calculate the logarithmic factor (between 0 and 1)
	const logFactor = (1 - Math.exp(-k * normalizedValue)) / (1 - Math.exp(-k));
	
	// To avoid precision loss when working with bigints, we'll use a high-precision approach
	// We'll multiply by a large factor, do integer division, then divide by the same factor
	const precision = 1000000n; // 6 decimal places of precision
	
	// Calculate (logFactor * precision) as a bigint
	const logFactorScaled = BigInt(Math.round(logFactor * Number(precision)));
	
	// Calculate (difficultyRange * logFactorScaled) / precision with proper rounding
	const difficultyOffset = (difficultyRange * logFactorScaled) / precision;
	
	return minDifficulty + difficultyOffset;
};

// TODO convert difficulty to a 0-1 threshold?
// TODO fix array access
// TODO check comments make sense

main()