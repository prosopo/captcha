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
import { hammingDistance } from "./hammingDistance.js";

/** Takes an array of binary strings and returns the bitwise majority */
export const majorityAverage = (bits: string[]): string => {
	if (bits.length === 0 || bits[0] === undefined) return "";

	const length = bits[0].length;
	let result = "";

	for (let i = 0; i < length; i++) {
		let ones = 0;
		let zeros = 0;

		// Loop each of the hashes for character i
		for (const b of bits) {
			if (b[i] === "1") ones++;
			else zeros++;
		}

		// Pick the majority bit (tie → 1 or 0 depending on your choice)
		result += ones >= zeros ? "1" : "0";
	}

	return result;
};

/**
 * Compares two binary strings and returns a similarity score between 0 and 1
 * 1.0 means identical, 0.0 means completely different
 */
export function compareBinaryStrings(hash1: string, hash2: string): number {
	const distance = hammingDistance(hash1, hash2);
	const maxDistance = hash1.length;

	// Convert Hamming distance to similarity score
	// similarity = 1 - (distance / maxDistance)
	return 1 - distance / maxDistance;
}
