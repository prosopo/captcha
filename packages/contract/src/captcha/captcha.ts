// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of provider <https://github.com/prosopo-io/provider>.
//
// provider is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// provider is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with provider.  If not, see <http://www.gnu.org/licenses/>.
import { ERRORS } from '../errors';
import { CaptchaMerkleTree } from './merkle';
import {
    AssetsResolver,
    Captcha, CaptchaImage, CaptchaSolution,
    CaptchaSolutionSchema,
    CaptchasSchema,
    CaptchaWithoutId,
    Dataset,
    DatasetSchema,
    DatasetWithIds
} from '../types';
import { hexHash, imageHash } from './util';
import {ProsopoEnvError} from "../handlers";


// import {encodeAddress} from "@polkadot/util-crypto";

export function addHashesToDataset(dataset: Dataset, tree: CaptchaMerkleTree): DatasetWithIds {
    try {
        dataset.captchas = dataset.captchas.map((captcha, index) => (
      {...captcha, captchaId: tree.leaves[index].hash} as Captcha
        ));

        return <DatasetWithIds>dataset;
    } catch (err) {
        throw new ProsopoEnvError(err, ERRORS.DATASET.HASH_ERROR.message);
    }
}

/**
 * Parse a dataset
 * @return {JSON} captcha dataset, stored in JSON
 * @param datasetJSON
 */
export function parseCaptchaDataset(datasetJSON: JSON): Dataset {
    try {
        return DatasetSchema.parse(datasetJSON);
    } catch (err) {
        throw new ProsopoEnvError(err, ERRORS.DATASET.PARSE_ERROR.message);
    }
}

/**
 * Make sure captchas are in the correct format
 * @param {JSON} captchaJSON captchas that have been passed in via dataset file
 * @return {CaptchaWithoutId[]} an array of parsed captchas that have not yet been hashed and have no IDs
 */
export function parseCaptchas(captchaJSON: JSON): CaptchaWithoutId[] {
    try {
        return CaptchasSchema.parse(captchaJSON);
    } catch (err) {
        throw new ProsopoEnvError(err, ERRORS.CAPTCHA.PARSE_ERROR.message);
    }
}

/**
 * Make sure captcha solutions are in the correct format
 * @param {JSON} captchaJSON captcha solutions received from the api
 * @return {CaptchaSolution[]} an array of parsed captcha solutions
 */
export function parseCaptchaSolutions(captchaJSON: JSON): CaptchaSolution[] {
    try {
        return CaptchaSolutionSchema.parse(captchaJSON);
    } catch (err) {
        throw new ProsopoEnvError(err, ERRORS.CAPTCHA.PARSE_ERROR.message);
    }
}

/**
 * Take an array of CaptchaSolutions and Captchas and check if the solutions are the same for each pair
 * @param  {CaptchaSolution[]} received
 * @param  {Captcha[]} stored
 * @return {boolean}
 */
export function compareCaptchaSolutions(received: CaptchaSolution[], stored: Captcha[]): boolean {
    if (received.length && stored.length && received.length === stored.length) {
        const receivedSorted = received.sort((a, b) => (a.captchaId > b.captchaId ? 1 : -1));
        const storedSorted = stored.sort((a, b) => (a.captchaId > b.captchaId ? 1 : -1));
        const successArr = receivedSorted.map((captcha, idx) => compareCaptcha(captcha, storedSorted[idx]));

        return successArr.every((val) => val);
    }

    return false;
}

/**
 * Check whether the `solution` arrays in a CaptchaSolution and stored Captcha are equivalent
 * @param  {CaptchaSolution} received
 * @param  {Captcha} stored
 * @return {boolean}
 */
export function compareCaptcha(received: CaptchaSolution, stored: Captcha): boolean {
    if (stored.solution && stored.solution.length > 0) {
    // this is a captcha we know the solution for
        const arr1 = received.solution.sort();
        const arr2 = stored.solution.sort();
        return arr1.length === arr2.length && arr1.every((value, index) => value === arr2[index]) && received.captchaId === stored.captchaId
    }

    // we don't know the solution so just assume it's correct
    return true;
}

/**
 * Compute the hash of various types of captcha, loading any images and hashing them in the process
 * @param  {Captcha} captcha
 * @return {string} the hex string hash
 */
export async function computeCaptchaHash(captcha: CaptchaWithoutId) {
    const itemHashes: string[] = [];

    for (const item of captcha.items) {
        if (item.type === 'image') {
            itemHashes.push(await imageHash(item.path as string));
        } else if (item.type === 'text') {
            itemHashes.push(hexHash(item.text as string));
        } else {
            throw new ProsopoEnvError(ERRORS.CAPTCHA.INVALID_ITEM_FORMAT.message);
        }
    }

    return hexHash([captcha.target, captcha.solution, captcha.salt, itemHashes].join());
}

/**
 * Create a unique solution commitment
 * @param  {CaptchaSolution} captcha
 * @return {string} the hex string hash
 */
export function computeCaptchaSolutionHash(captcha: CaptchaSolution) {
    return hexHash([captcha.captchaId, captcha.solution, captcha.salt].join());
}

/**
 * Compute hashes for an array of captchas
 * @param  {Captcha[]} captchas
 * @return {Promise<CaptchaSolution[]>} captchasWithHashes
 */
export async function computeCaptchaHashes(captchas: CaptchaWithoutId[]): Promise<CaptchaSolution[]> {
    const captchasWithHashes: CaptchaSolution[] = [];

    for (const captcha of captchas) {
        const captchaId = await computeCaptchaHash(captcha);
        const captchaWithId: Captcha = {captchaId, ...captcha};
        const captchaSol = convertCaptchaToCaptchaSolution(captchaWithId);

        captchasWithHashes.push(captchaSol);
    }

    return captchasWithHashes;
}

/**
 * Map a Captcha to a Captcha solution (drop items, target, etc.)
 * @param  {Captcha} captcha
 * @return {CaptchaSolution}
 */
export function convertCaptchaToCaptchaSolution(captcha: Captcha): CaptchaSolution {
    return {captchaId: captcha.captchaId, salt: captcha.salt, solution: captcha.solution}
}

/**
 * Compute hash for an array of captcha ids, userAccount, and salt, which serves as the identifier for a pending request
 * @param  {string[]} captchaIds
 * @param  {string} userAccount
 * @param  {string} salt
 * @return {string}
 */
export function computePendingRequestHash(captchaIds: string[], userAccount: string, salt: string): string {
    return hexHash([...captchaIds.sort(), userAccount, salt].join());
}

/**
 * Parse the image items in a captcha and pass back a URI if they exist
 */
export function parseCaptchaAssets(item: CaptchaImage, assetsResolver: AssetsResolver | undefined) {
    return {...item, path: assetsResolver?.resolveAsset(item.path).getURL() || item.path}
}

