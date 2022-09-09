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
    Captcha, CaptchaImage, CaptchaRaw, CaptchaSolution,
    CaptchaSolutionRaw,
    CaptchaSolutionSchema,
    CaptchaWithoutId,
    Dataset,
    DatasetRaw,
    DatasetSchema,
    DatasetWithIds,
    HashedSolution,
    RawSolution
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
export function parseCaptchaDataset(datasetJSON: JSON): DatasetRaw {
    try {
        return DatasetSchema.parse(datasetJSON);
    } catch (err) {
        throw new ProsopoEnvError(err, ERRORS.DATASET.PARSE_ERROR.message);
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

function captchaSort<T extends { captchaId: string }>(a: T, b: T) {
    return a.captchaId.localeCompare(b.captchaId);
}

export async function sortAndComputeHashes(
    received: CaptchaSolution[],
    stored: Captcha[]
): Promise<{ captchaId: string; hash: string }[]> {
    const _received = received.sort(captchaSort);
    const _stored = stored.sort(captchaSort);

    return Promise.all(
        _stored
            .map(
                async (
                    { salt, items = [], target = "", captchaId, solved },
                    index
                ) => {
                    if (captchaId != _received[index].captchaId) {
                        throw new ProsopoEnvError(
                            ERRORS.CAPTCHA.ID_MISMATCH.message
                        );
                    }

                    return {
                        hash: await computeCaptchaHash({
                            solution: solved ? received[index].solution : [],
                            salt,
                            items,
                            target,
                        }),
                        captchaId,
                    };
                }
            )
    );
}

/**
 * Take an array of CaptchaSolutions and Captchas and check if the solutions are the same for each pair
 * @param  {CaptchaSolution[]} received
 * @param  {Captcha[]} stored
 * @return {boolean}
 */
export async function compareCaptchaSolutions(received: CaptchaSolution[], stored: Captcha[]): Promise<boolean> {
    if (received.length && stored.length && received.length === stored.length) {
        const hashes = await sortAndComputeHashes(received, stored);
        return hashes.every(({ hash, captchaId }) => hash === captchaId);
    }

    return false;
}

/**
 * Compute the hash of various types of captcha, loading any images and hashing them in the process
 * @param  {Captcha} captcha
 * @return {string} the hex string hash
 */
export async function computeCaptchaHash(captcha: CaptchaWithoutId) {
    const itemHashes: string[] = [];

    for (const [item, index] of captcha.items.map((v, i) => [v, i])) {
        if (item.type === 'image') {
            const hash = await imageHash(item.path as string);
            itemHashes.push(hash);
            captcha.items[index].hash = hash;
        } else if (item.type === 'text') {
            const hash = hexHash(item.text as string);
            itemHashes.push(hash);
            captcha.items[index].hash = hash;
        } else {
            throw new ProsopoEnvError(ERRORS.CAPTCHA.INVALID_ITEM_FORMAT.message);
        }
    }

    return hexHash(
        [
            captcha.target,
            captcha.solution,
            captcha.salt,
            itemHashes,
        ].join()
    );
}

export function hashSolutions(arr?: RawSolution[]): HashedSolution[] {
    return arr?.map((solution) => hexHash(solution.toString())).sort() || [];
}

// export function hashSolutions<T>(solutions: T[]): T[] {
//     try {
//         return solutions?.map(({ solution, ...rest }: any) => ({
//             ...rest,
//             solution: hashSolutionRaw(solution),
//         }));
//     } catch (err) {
//         console.error(err);
//         // @ts-ignore
//         return arg0;
//     }
// }

/**
 * Create a unique solution commitment
 * @param  {CaptchaSolution} captcha
 * @return {string} the hex string hash
 */
export function computeCaptchaSolutionHash(captcha: CaptchaSolution) {
    return hexHash([captcha.captchaId, captcha.solution, captcha.salt].join());
}

// /**
//  * Compute hashes for an array of captchas
//  * @param  {Captcha[]} captchas
//  * @return {Promise<CaptchaSolution[]>} captchasWithHashes
//  */
// export async function computeCaptchaHashes(captchas: CaptchaWithoutId[]): Promise<CaptchaSolution[]> {
//     const captchasWithHashes: CaptchaSolution[] = [];

//     for (const captcha of captchas) {
//         const captchaId = await computeCaptchaHash(captcha);
//         const captchaWithId: Captcha = {captchaId, ...captcha};
//         const captchaSol = convertCaptchaToCaptchaSolution(captchaWithId);

//         captchasWithHashes.push(captchaSol);
//     }

//     return captchasWithHashes;
// }

/**
 * Map a Captcha to a Captcha solution (drop items, target, etc.)
 * @param  {Captcha} captcha
 * @return {CaptchaSolution}
 */
export function convertCaptchaToCaptchaSolution(captcha: CaptchaRaw): CaptchaSolutionRaw {
    return {captchaId: captcha.captchaId, salt: captcha.salt, solution: captcha.solution || []}
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

