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

import { isHex } from "@polkadot/util";
import { ProsopoDatasetError, ProsopoEnvError } from "@prosopo/common";
import {
	type AssetsResolver,
	type Captcha,
	type CaptchaSolution,
	CaptchaSolutionArraySchema,
	type CaptchaWithoutId,
	type DatasetRaw,
	DatasetWithNumericSolutionSchema,
	type HashedItem,
	type HashedSolution,
	type Item,
	type RawSolution,
} from "@prosopo/types";
import type { SolutionRecord } from "@prosopo/types-database";
import { at } from "@prosopo/util";
import { hexHash, hexHashArray } from "@prosopo/util-crypto";
import { downloadImage } from "./util.js";

export const NO_SOLUTION_VALUE = "NO_SOLUTION";

/**
 * Parse a dataset
 * @return {JSON} captcha dataset, stored in JSON
 * @param datasetJSON
 */
export function parseCaptchaDataset(datasetJSON: JSON): DatasetRaw {
	try {
		const result = DatasetWithNumericSolutionSchema.parse(datasetJSON);

		const result2: DatasetRaw = {
			format: result.format,
			captchas: result.captchas.map((captcha) => {
				return {
					...captcha,
					solution: captcha.solution
						? matchItemsToSolutions(captcha.solution, captcha.items)
						: [],
					unlabelled: captcha.unlabelled
						? matchItemsToSolutions(captcha.unlabelled, captcha.items)
						: [],
				};
			}),
		};
		if (result.datasetId !== undefined) result2.datasetId = result.datasetId;
		if (result.contentTree !== undefined)
			result2.contentTree = result.contentTree;
		if (result.datasetContentId !== undefined)
			result2.datasetContentId = result.datasetContentId;
		if (result.solutionTree !== undefined)
			result2.solutionTree = result.solutionTree;
		return result2;
	} catch (err) {
		throw new ProsopoDatasetError("DATASET.DATASET_PARSE_ERROR", {
			context: { error: err },
		});
	}
}

/**
 * Make sure captcha solutions are in the correct format
 * @param {JSON} captchaJSON captcha solutions received from the api
 * @return {CaptchaSolution[]} an array of parsed and sorted captcha solutions
 */
export function parseAndSortCaptchaSolutions(
	captchaJSON: CaptchaSolution[],
): CaptchaSolution[] {
	try {
		return CaptchaSolutionArraySchema.parse(captchaJSON).map((captcha) => ({
			...captcha,
			solution: captcha.solution.sort(),
		}));
	} catch (err) {
		throw new ProsopoDatasetError("DATASET.SOLUTION_PARSE_ERROR", {
			context: { error: err },
		});
	}
}

export function captchaSort<T extends { captchaId: string }>(a: T, b: T) {
	return a.captchaId.localeCompare(b.captchaId);
}

export function sortAndComputeHashes(
	received: CaptchaSolution[],
	stored: Captcha[],
): { captchaId: string; hash: string }[] {
	received.sort(captchaSort);
	stored.sort(captchaSort);

	return stored.map(
		({ salt, items = [], target = "", captchaId, solved }, index) => {
			const item = at(received, index);
			if (captchaId !== item.captchaId) {
				throw new ProsopoEnvError("CAPTCHA.ID_MISMATCH");
			}

			return {
				hash: computeCaptchaHash(
					{
						solution: solved ? item.solution : [],
						salt,
						items,
						target,
					},
					true,
					true,
					false,
				),
				captchaId,
			};
		},
	);
}

/**
 * Take an array of CaptchaSolutions and Captchas and check if the solutions are the same for each pair
 * @param  {CaptchaSolution[]} received
 * @param solutions
 * @param totalImages
 * @param  {number} threshold the percentage of captchas that must be correct to return true
 * @return {boolean}
 */
export function compareCaptchaSolutions(
	received: CaptchaSolution[],
	solutions: SolutionRecord[],
	totalImages: number,
	threshold: number,
): boolean {
	// Sort both arrays by captchaId
	received.sort(captchaSort);
	solutions.sort(captchaSort);

	// Check if lengths match
	if (received.length !== solutions.length) {
		return false;
	}

	if (
		received.length &&
		solutions.length &&
		received.length === solutions.length
	) {
		// make sure captchaId matches in each pair
		const captchaIdMismatch = received.some(
			(captcha, index) =>
				solutions[index] && captcha.captchaId !== solutions[index].captchaId,
		);
		if (captchaIdMismatch) {
			return false;
		}
	}

	// Verify each captcha solution against expected solution
	return received.every((captcha, index) => {
		const sortedReceivedSolution = captcha.solution.sort();
		const targetSolution = solutions[index]?.solution.sort();

		// Ensure target solution exists
		if (!targetSolution) {
			return false;
		}

		// Count incorrect and missing solutions
		const incorrectCount = sortedReceivedSolution.filter(
			(solution) => !targetSolution.includes(solution),
		).length;
		const missingCount = targetSolution.filter(
			(solution) => !sortedReceivedSolution.includes(solution),
		).length;

		// Calculate correctness percentage
		const totalIncorrect = incorrectCount + missingCount;
		const percentageCorrect = 1 - totalIncorrect / totalImages;

		// Return whether solution meets threshold
		return percentageCorrect >= threshold;
	});
}

/**
 * Compute the hash of various types of captcha
 * @param  {Captcha} captcha
 * @param  {boolean} includeSolution
 * @param  {boolean} includeSalt
 * @param  {boolean} sortItemHashes
 * @return {string} the hex string hash
 */
export function computeCaptchaHash(
	captcha: CaptchaWithoutId,
	includeSolution: boolean,
	includeSalt: boolean,
	sortItemHashes: boolean,
): string {
	try {
		const itemHashes: string[] = captcha.items.map((item, index) => {
			if (item.hash) {
				return item.hash;
			}
			throw new ProsopoDatasetError("CAPTCHA.MISSING_ITEM_HASH", {
				context: {
					computeCaptchaHashName: computeCaptchaHash.name,
					index,
				},
			});
		});
		return hexHashArray([
			captcha.target,
			// empty array hashes as empty string, undefined solution results in the array [`NO_SOLUTION`]
			// [undefined] also hashes as empty string, which is why we don't use it
			...(includeSolution ? getSolutionValueToHash(captcha.solution) : []),
			includeSalt ? captcha.salt : "",
			sortItemHashes ? itemHashes.sort() : itemHashes,
		]);
	} catch (err) {
		throw new ProsopoDatasetError("DATASET.HASH_ERROR", {
			context: { error: err },
		});
	}
}

/** Return the sorted solution value or ['NO_SOLUTION'] if there is no solution. Ensures that an empty array is a valid
 * solution
 * @param solution
 */
export function getSolutionValueToHash(
	solution?: HashedSolution[] | RawSolution[],
) {
	return solution !== undefined ? solution.sort() : [NO_SOLUTION_VALUE];
}

/** Compute the hash of a captcha item, downloading the image if necessary
 * @param  {Item} item
 * @return {Promise<HashedItem>} the hex string hash of the item
 */
export async function computeItemHash(item: Item): Promise<HashedItem> {
	if (item.type === "text") {
		return { ...item, hash: hexHash(item.data) };
	}
	if (item.type === "image") {
		return { ...item, hash: hexHash(await downloadImage(item.data)) };
	}
	throw new ProsopoDatasetError("CAPTCHA.INVALID_ITEM_FORMAT");
}

/**
 * Converts an indexed captcha solution to a hashed captcha solution or simply returns the hash if it is already hashed
 * @return {HashedSolution[]}
 * @param {RawSolution[] | HashedSolution[]} solutions
 * @param {Item[]} items
 */
export function matchItemsToSolutions(
	solutions: RawSolution[] | HashedSolution[],
	items: HashedItem[] | undefined,
): HashedSolution[] {
	if (!items) {
		return [];
	}
	return solutions.map((solution: string | number) => {
		if (typeof solution === "string" && isHex(solution)) {
			// solution must already be a hash
			// check that solution is in items array
			if (!items?.some((item) => item.hash === solution)) {
				throw new ProsopoDatasetError("CAPTCHA.INVALID_ITEM_HASH");
			}
			return solution;
		}
		if (typeof solution === "number") {
			// else solution must be a number
			// so lookup the item at that index
			const item = at(items, solution);
			// get the hash of the item
			return item.hash;
		}
		throw new ProsopoDatasetError("CAPTCHA.INVALID_SOLUTION_TYPE");
	});
}

/**
 * Create a unique solution commitment
 * @param  {CaptchaSolution} captcha
 * @return {string} the hex string hash
 */
export function computeCaptchaSolutionHash(captcha: CaptchaSolution): string {
	return hexHashArray([
		captcha.captchaId,
		captcha.captchaContentId,
		[...captcha.solution].sort(),
		captcha.salt,
	]);
}

/**
 * Compute hash for an array of captcha ids, userAccount, and salt, which serves as the identifier for a pending request
 * @param  {string[]} captchaIds
 * @param  {string} userAccount
 * @param  {string} salt
 * @return {string}
 */
export function computePendingRequestHash(
	captchaIds: string[],
	userAccount: string | number[],
	salt: string,
): string {
	return hexHashArray([...captchaIds.sort(), userAccount, salt]);
}

/**
 * Parse the image items in a captcha and pass back a URI if they exist
 * @param  {Item} item
 * @param  {AssetsResolver} assetsResolver
 */
export function parseCaptchaAssets(
	item: Item,
	assetsResolver: AssetsResolver | undefined,
): Item {
	return {
		...item,
		data: assetsResolver?.resolveAsset(item.data).getURL() || item.data,
	};
}
