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

import { InputMethod } from "@prosopo/types";
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

export const peelCheckboxPrefix = (
	flat: number[][],
	solutionLengths: number[],
): { checkbox?: [number, number]; flat: number[][] } => {
	const firstFlat = flat[0];
	const firstLen = solutionLengths[0];
	if (firstFlat === undefined || firstLen === undefined) {
		return { flat };
	}
	if (firstFlat.length === 2 * firstLen + 2) {
		const checkbox: [number, number] = [at(firstFlat, 0), at(firstFlat, 1)];
		const stripped = [firstFlat.slice(2), ...flat.slice(1)];
		return { checkbox, flat: stripped };
	}
	return { flat };
};

/**
 * The input method of every coordinate pair embedded in each captcha's salt.
 * A captcha that declares none gets pointer for every pair, which keeps
 * requests from older widgets under the full repeated-position check.
 * Returns `undefined` when a captcha declares a different number of methods
 * than it has pairs: the official widget never sends that.
 * @param flat the coordinates extracted from each captcha's salt
 * @param declared the input methods each captcha declared, if any
 */
export const resolveInputMethods = (
	flat: number[][],
	declared: (readonly InputMethod[] | undefined)[],
): InputMethod[][] | undefined => {
	const resolved: InputMethod[][] = [];
	for (const [index, list] of flat.entries()) {
		const pairCount = list.length / 2;
		const methods = declared[index];
		if (methods === undefined) {
			resolved.push(
				new Array<InputMethod>(pairCount).fill(InputMethod.pointer),
			);
		} else if (methods.length === pairCount) {
			resolved.push([...methods]);
		} else {
			return undefined;
		}
	}
	return resolved;
};

/**
 * Give the checkbox's input method its own list, as `peelCheckboxPrefix` does
 * for its coordinates, so the result lines up with the pair lists.
 * @param methods the input methods of each captcha, checkbox first
 */
export const peelCheckboxInputMethod = (
	methods: InputMethod[][],
): InputMethod[][] => {
	const [first, ...rest] = methods;
	if (first === undefined || first.length === 0) {
		return methods;
	}
	return [first.slice(0, 1), first.slice(1), ...rest];
};

const isKeyboard = (
	inputMethods: InputMethod[][] | undefined,
	listIndex: number,
	pairIndex: number,
): boolean => inputMethods?.[listIndex]?.[pairIndex] === InputMethod.keyboard;

/**
 * Whether any keyboard selection carries a pointer position. Keyboard
 * activation has none, and the widget sends (0, 0) for it, so a position here
 * means the request did not come from the widget.
 * @param pairsLists
 * @param inputMethods the same shape as `pairsLists`
 */
export const keyboardSelectionHasPosition = (
	pairsLists: [number, number][][],
	inputMethods: InputMethod[][],
): boolean =>
	pairsLists.some((pairList, listIndex) =>
		pairList.some(
			([x, y], pairIndex) =>
				isKeyboard(inputMethods, listIndex, pairIndex) && (x !== 0 || y !== 0),
		),
	);

/**
 * Check whether any pointer position repeats across the lists of pairs. A
 * person selecting the same tile in two rounds almost never lands on the same
 * pixel twice, whereas a script clicking each element's centre does. Keyboard
 * selections have no position and are left out; without `inputMethods` every
 * pair is a pointer selection.
 * @param pairsLists
 * @param inputMethods the same shape as `pairsLists`
 */
export const containsIdenticalPairs = (
	pairsLists: [number, number][][],
	inputMethods?: InputMethod[][],
): boolean => {
	const seen = new Set<string>();
	for (const [listIndex, pairList] of pairsLists.entries()) {
		for (const [pairIndex, pair] of pairList.entries()) {
			if (isKeyboard(inputMethods, listIndex, pairIndex)) {
				continue;
			}
			const coordString = `${at(pair, 0)},${at(pair, 1)}`;
			if (seen.has(coordString)) {
				return true;
			}
			seen.add(coordString);
		}
	}
	return false;
};

/**
 * Whether the selections point to a script rather than a person: the declared
 * input methods do not line up with the coordinates, a keyboard selection
 * carries a position, or a pointer position repeats.
 * @param pairsLists
 * @param inputMethods the same shape as `pairsLists`, or `undefined` when the
 * declared methods did not line up with the coordinates
 */
export const selectionsLookScripted = (
	pairsLists: [number, number][][],
	inputMethods: InputMethod[][] | undefined,
): boolean =>
	inputMethods === undefined ||
	keyboardSelectionHasPosition(pairsLists, inputMethods) ||
	containsIdenticalPairs(pairsLists, inputMethods);
