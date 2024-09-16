// Copyright 2021-2024 Prosopo (UK) Ltd.
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
// create a generator that yields the permutations for a set of options
// E.g. say we have 3 chars which can take 2 values each ('a' or 'b'), then we have 2^3 = 8 permutations:
//     a a a
//     a a b
//     a b a
//     a b b
//     b a a
//     b a b
//     b b a
//     b b b
// This function yields each permutation as an array of numbers, where each number is the index of the option for that position
// E.g. for the above example, the first permutation is [0, 0, 0], the second is [0, 0, 1], the third is [0, 1, 0], etc.
//
// The bins param is an array of numbers, where each number is the number of options for that position
// E.g. for the above example, the bins param would be [2, 2, 2]
//
// Note that the bins can be differing sizes, so the first char could have 2 options whereas the second could have 3 options and the fourth char could have 6 options
//
// Optionally include the empty permutation, i.e. [] (useful for when you want to include the empty permutation in a cartesian product)
export function* permutations(
	bins: number[],
	options?: {
		includeEmpty?: boolean;
	},
): Generator<number[]> {
	if (options?.includeEmpty) {
		yield [];
	}
	if (bins.length === 0) {
		return;
	}
	const arr = Array.from({ length: bins.length }, () => 0);
	let i = arr.length - 1;
	while (true) {
		yield [...arr];
		// biome-ignore lint/style/noNonNullAssertion: ts thinks array is potentially undefined
		arr[i]!++;
		while (arr[i] === bins[i]) {
			arr[i] = 0;
			i--;
			if (i < 0) {
				return;
			}
			// biome-ignore lint/style/noNonNullAssertion: ts thinks array is potentially undefined
			arr[i]!++;
		}
		i = arr.length - 1;
	}
}
