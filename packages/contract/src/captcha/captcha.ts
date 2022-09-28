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
    CaptchaWithoutId,
    Dataset,
    DatasetRaw,
    DatasetSchema,
    DatasetWithIds,
    HashedSolution,
    RawSolution
} from '../types';
import { hexHash } from './util';
import {ProsopoEnvError} from "../handlers";

// import {encodeAddress} from "@polkadot/util-crypto";

export function addHashesToDataset(dataset: Dataset, tree: CaptchaMerkleTree): DatasetWithIds {
    try {
        dataset.captchas = dataset.captchas.map((captcha, index) => (
      {...captcha, captchaId: tree.leaves[index].hash} as Captcha
        ));

        return <DatasetWithIds>dataset;
    } catch (err) {
        throw new ProsopoEnvError(err, "DATASET.HASH_ERROR");
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
        throw new ProsopoEnvError(err, "DATASET.PARSE_ERROR");
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
        throw new ProsopoEnvError(err, "CAPTCHA.PARSE_ERROR");
    }
}

function captchaSort<T extends { captchaId: string }>(a: T, b: T) {
    return a.captchaId.localeCompare(b.captchaId);
}

export function sortAndComputeHashes(
    received: CaptchaSolution[],
    stored: Captcha[]
): { captchaId: string; hash: string }[] {
    received.sort(captchaSort);
    stored.sort(captchaSort);

    return stored.map(
        ({ salt, items = [], target = "", captchaId, solved }, index) => {
            if (captchaId != received[index].captchaId) {
                throw new ProsopoEnvError(ERRORS.CAPTCHA.ID_MISMATCH.message);
            }

            return {
                hash: computeCaptchaHash({
                    solution: solved ? received[index].solution : [],
                    salt,
                    items,
                    target,
                }),
                captchaId,
            };
        }
    );
}

/**
 * Take an array of CaptchaSolutions and Captchas and check if the solutions are the same for each pair
 * @param  {CaptchaSolution[]} received
 * @param  {Captcha[]} stored
 * @return {boolean}
 */
export function compareCaptchaSolutions(received: CaptchaSolution[], stored: Captcha[]): boolean {
    if (received.length && stored.length && received.length === stored.length) {
        const hashes = sortAndComputeHashes(received, stored);
        return hashes.every(({ hash, captchaId }) => hash === captchaId);
    }

    return false;
}

/**
 * Compute the hash of various types of captcha
 * @param  {Captcha} captcha
 * @return {string} the hex string hash
 */
export function computeCaptchaHash(captcha: CaptchaWithoutId) {
    const itemHashes: string[] = captcha.items.map((item) => item.hash);

    return hexHash(
        [
            captcha.target,
            captcha.solution?.sort(),
            captcha.salt,
            itemHashes,
        ].join()
    );
}

export function calculateItemHashes(items: any[]): any[] {
    return items.map((item) => {
        if (item.type === "image" || item.type === "text") {
            return { ...item, hash: hexHash((item.text || item.path) as string) };
        } else {
            throw new ProsopoEnvError(
                ERRORS.CAPTCHA.INVALID_ITEM_FORMAT.message
            );
        }
    });
}

export function matchItemsToSolutions(
    solutions: RawSolution[] | undefined,
    items: any[] | undefined
): HashedSolution[] {
    return solutions?.map((solution) => {
        const hash = items?.[solution].hash;

        if (!hash) {
            throw new ProsopoEnvError(ERRORS.CAPTCHA.MISSING_ITEM_HASH.message);
        }

        return hash;
    }) || [];
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
    return hexHash([captcha.captchaId, captcha.solution.sort(), captcha.salt].join());
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
export function convertCaptchaToCaptchaSolution(captcha: Captcha): CaptchaSolution {
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

