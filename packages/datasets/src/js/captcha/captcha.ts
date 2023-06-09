// Copyright 2021-2023 Prosopo (UK) Ltd.
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
import {
    AssetsResolver,
    Captcha,
    CaptchaSolution,
    CaptchaSolutionArraySchema,
    CaptchaWithoutId,
    DatasetRaw,
    DatasetSchema,
    HashedItem,
    HashedSolution,
    Item,
    RawSolution,
} from '@prosopo/types'
import { ProsopoEnvError, hexHash, hexHashArray } from '@prosopo/common'
import { downloadImage } from './util'
import { isHex } from '@polkadot/util'

// import {encodeAddress} from "@polkadot/util-crypto";

/**
 * Parse a dataset
 * @return {JSON} captcha dataset, stored in JSON
 * @param datasetJSON
 */
export function parseCaptchaDataset(datasetJSON: JSON): DatasetRaw {
    try {
        return DatasetSchema.parse(datasetJSON)
    } catch (err) {
        throw new ProsopoEnvError(err, 'ERRORS.DATASET.PARSE_ERROR')
    }
}

/**
 * Make sure captcha solutions are in the correct format
 * @param {JSON} captchaJSON captcha solutions received from the api
 * @return {CaptchaSolution[]} an array of parsed and sorted captcha solutions
 */
export function parseAndSortCaptchaSolutions(captchaJSON: CaptchaSolution[]): CaptchaSolution[] {
    try {
        return CaptchaSolutionArraySchema.parse(captchaJSON).map((captcha) => ({
            ...captcha,
            solution: captcha.solution.sort(),
        }))
    } catch (err) {
        throw new ProsopoEnvError(err, 'ERRORS.CAPTCHA.PARSE_ERROR')
    }
}

export function captchaSort<T extends { captchaId: string }>(a: T, b: T) {
    return a.captchaId.localeCompare(b.captchaId)
}

export function sortAndComputeHashes(
    received: CaptchaSolution[],
    stored: Captcha[]
): { captchaId: string; hash: string }[] {
    received.sort(captchaSort)
    stored.sort(captchaSort)

    return stored.map(({ salt, items = [], target = '', captchaId, solved }, index) => {
        if (captchaId != received[index].captchaId) {
            throw new ProsopoEnvError('CAPTCHA.ID_MISMATCH')
        }

        return {
            hash: computeCaptchaHash(
                {
                    solution: solved ? received[index].solution : [],
                    salt,
                    items,
                    target,
                },
                true,
                true,
                false
            ),
            captchaId,
        }
    })
}

/**
 * Take an array of CaptchaSolutions and Captchas and check if the solutions are the same for each pair
 * @param  {CaptchaSolution[]} received
 * @param  {Captcha[]} stored
 * @return {boolean}
 */
export function compareCaptchaSolutions(received: CaptchaSolution[], stored: Captcha[]): boolean {
    if (received.length && stored.length && received.length === stored.length) {
        const hashes = sortAndComputeHashes(received, stored)
        return hashes.every(({ hash, captchaId }) => hash === captchaId)
    }

    return false
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
    includeSolution = false,
    includeSalt = false,
    sortItemHashes: boolean
): string {
    try {
        const itemHashes: string[] = captcha.items.map((item, index) => {
            if (item.hash) {
                return item.hash
            } else {
                throw new ProsopoEnvError('CAPTCHA.MISSING_ITEM_HASH', computeCaptchaHash.name, undefined, index)
            }
        })
        return hexHashArray([
            captcha.target,
            ...(includeSolution && captcha.solution ? captcha.solution.sort() : []),
            includeSalt ? captcha.salt : '',
            sortItemHashes ? itemHashes.sort() : itemHashes,
        ])
    } catch (err) {
        throw new ProsopoEnvError(err)
    }
}

/** Compute the hash of a captcha item, downloading the image if necessary
 * @param  {Item} item
 * @return {Promise<HashedItem>} the hex string hash of the item
 */
export async function computeItemHash(item: Item): Promise<HashedItem> {
    if (item.type === 'text') {
        return { ...item, hash: hexHash(item.data) }
    } else if (item.type === 'image') {
        return { ...item, hash: hexHash(await downloadImage(item.data)) }
    } else {
        throw new ProsopoEnvError('CAPTCHA.INVALID_ITEM_FORMAT')
    }
}

/**
 * Converts an indexed captcha solution to a hashed captcha solution or simply returns the hash if it is already hashed
 * @return {HashedSolution[]}
 * @param {RawSolution[] | HashedSolution[]} solutions
 * @param {Item[]} items
 */
export function matchItemsToSolutions(
    solutions: RawSolution[] | HashedSolution[],
    items: Item[] | undefined
): HashedSolution[] {
    return (
        solutions?.map((solution: string | number) => {
            const hash = items && items[solution] && items[solution].hash ? items[solution].hash : solution

            if (!hash) {
                throw new ProsopoEnvError('CAPTCHA.MISSING_ITEM_HASH')
            }

            if (!isHex(hash)) {
                throw new ProsopoEnvError('CAPTCHA.INVALID_ITEM_HASH')
            }

            return hash
        }) || []
    )
}

/**
 * Create a unique solution commitment
 * @param  {CaptchaSolution} captcha
 * @return {string} the hex string hash
 */
export function computeCaptchaSolutionHash(captcha: CaptchaSolution) {
    // TODO: should the captchaContentId be validated?
    return hexHashArray([captcha.captchaId, captcha.captchaContentId, [...captcha.solution].sort(), captcha.salt])
}

/**
 * Compute hash for an array of captcha ids, userAccount, and salt, which serves as the identifier for a pending request
 * @param  {string[]} captchaIds
 * @param  {string} userAccount
 * @param  {string} salt
 * @return {string}
 */
export function computePendingRequestHash(captchaIds: string[], userAccount: string, salt: string): string {
    return hexHashArray([...captchaIds.sort(), userAccount, salt])
}

/**
 * Parse the image items in a captcha and pass back a URI if they exist
 */
export function parseCaptchaAssets(item: Item, assetsResolver: AssetsResolver | undefined) {
    return { ...item, path: assetsResolver?.resolveAsset(item.data).getURL() || item.data }
}
