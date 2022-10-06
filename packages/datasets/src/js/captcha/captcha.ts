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
import {ERRORS} from '../errors';
import {
    AssetsResolver,
    Captcha,
    CaptchaSolution,
    CaptchaSolutionSchema,
    CaptchaWithoutId,
    DatasetRaw,
    DatasetSchema,
    HashedSolution,
    Item,
    RawSolution
} from '../types/index';
import {hexHash} from './util';
import {ProsopoEnvError} from "@prosopo/contract";

// import {encodeAddress} from "@polkadot/util-crypto";



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

export function sortAndComputeHashes(
    received: CaptchaSolution[],
    stored: Captcha[]
): { captchaId: string; hash: string }[] {
    received.sort(captchaSort);
    stored.sort(captchaSort);

    return stored.map(
        ({salt, items = [], target = "", captchaId, solved}, index) => {
            if (captchaId != received[index].captchaId) {
                throw new ProsopoEnvError("CAPTCHA.ID_MISMATCH");
            }

            return {
                hash: computeCaptchaHash({
                    solution: solved ? received[index].solution : [],
                    salt,
                    items,
                    target,
                }, true, true, false),
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
        return hashes.every(({hash, captchaId}) => hash === captchaId);
    }

    return false;
}

/**
 * Compute the hash of various types of captcha
 * @param  {Captcha} captcha
 * @param  {boolean} includeSolution
 * @param  {boolean} includeSalt
 * @param  {boolean} sortItemHashes
 * @return {string} the hex string hash
 */
export function computeCaptchaHash(captcha: CaptchaWithoutId, includeSolution = false, includeSalt= false, sortItemHashes: boolean): string {
    try {
        const itemHashes: string[] = captcha.items.map((item, index) => item.hash ? item.hash : calculateItemHashes([item])[0].hash!);
        return hexHash(
            [
                captcha.target,
                ...(includeSolution && captcha.solution ? captcha.solution.sort() : []),
                includeSalt ? captcha.salt: '',
                sortItemHashes ? itemHashes.sort(): itemHashes,
            ].join()
        );
    } catch (err) {
        throw new ProsopoEnvError(err);
    }
}

export function calculateItemHashes(items: Item[]): Item[] {
    return items.map((item) => {
        if (item.type === "image" || item.type === "text") {
            return {...item, hash: hexHash((item.data) as string)};
        } else {
            throw new ProsopoEnvError(
                "CAPTCHA.INVALID_ITEM_FORMAT"
            );
        }
    });
}

export function matchItemsToSolutions(
    solutions: RawSolution[] | undefined,
    items: Item[] | undefined
): HashedSolution[] {
    return solutions?.map((solution) => {
        const hash = items?.[solution].hash;

        if (!hash) {
            throw new ProsopoEnvError("CAPTCHA.MISSING_ITEM_HASH");
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
    return {captchaId: captcha.captchaId, captchaContentId: captcha.captchaContentId, salt: captcha.salt, solution: captcha.solution || []}
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
export function parseCaptchaAssets(item: Item, assetsResolver: AssetsResolver | undefined) {
    return {...item, path: assetsResolver?.resolveAsset(item.data).getURL() || item.data}
}

