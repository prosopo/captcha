// Copyright 2021-2026 Prosopo (UK) Ltd.
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

import { at } from "@prosopo/util";

/** Construct list of pairs from flat list
 * @param list
 */
export const constructPairList = (list: number[]): [number, number][] => {
	// if set of pairs is not even, fail
	if (list.length % 2 !== 0) {
		throw new Error("Invalid pairs length");
	}

	const pairList: [number, number][] = [];
	for (let i = 0; i < list.length; i += 2) {
		pairList.push([at(list, i), at(list, i + 1)]);
	}
	return pairList;
};

/**
 * Check if there are identical pairs in flattened lists of pairs
 * @param pairsLists
 */
export const containsIdenticalPairs = (pairsLists: [number, number][][]) => {
	const set = new Set<string>();

	for (const pairList of pairsLists) {
		for (const pair of pairList) {
			const x = at(pair, 0);
			const y = at(pair, 1);
			const coordString = `${x},${y}`;
			set.add(coordString);
		}
	}

	// if the size of the set is less than half the total number of coordinates, there are identical pairs
	return set.size !== pairsLists.flat().flat().length / 2;
};
