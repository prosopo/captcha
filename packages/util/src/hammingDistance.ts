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
/**
 * Calculates Hamming distance between two binary strings
 * @returns the number of differing bits
 */
export function hammingDistance(hash1: string, hash2: string): number {
	if (hash1.length !== hash2.length) {
		throw new Error("Hashes must be of equal length");
	}

	let distance = 0;
	for (let i = 0; i < hash1.length; i++) {
		if (hash1[i] !== hash2[i]) {
			distance++;
		}
	}
	return distance;
}
