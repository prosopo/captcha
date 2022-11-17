// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of provider <https://github.com/prosopo/provider>.
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
import {
    AssetsResolver,
    Captcha,
    CaptchaSolution,
    CaptchaSolutionArraySchema,
    CaptchaWithoutId,
    DatasetRaw,
    DatasetSchema,
    HashedSolution,
    Item,
    RawSolution,
} from '../types/index'
import { hexHash, hexHashArray } from './util'
import { ProsopoEnvError } from '../types/error'
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
export function parseAndSortCaptchaSolutions(captchaJSON: JSON): CaptchaSolution[] {
    try {
        const parsed = CaptchaSolutionArraySchema.parse(captchaJSON)
        parsed.map((captcha) => ({ ...captcha, solution: captcha.solution.sort() }))
        return parsed
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
        const itemHashes: string[] = captcha.items.map((item, index) =>
            item.hash ? item.hash : calculateItemHashes([item])[0].hash!
        )
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

export function calculateItemHashes(items: Item[]): Item[] {
    //TODO actually hash the images
    return items.map((item) => {
        if (item.type === 'image' || item.type === 'text') {
            return { ...item, hash: hexHash(item.data as string) }
        } else {
            throw new ProsopoEnvError('CAPTCHA.INVALID_ITEM_FORMAT')
        }
    })
}

/**
 * Converts an indexed captcha solution to a hashed captcha solution or simply returns the hash if it is already hashed
 * @return {HashedSolution[]}
 * @param {RawSolution[] | HashedSolution[]} solutions
 * @param {Item[]} items
 */
export function matchItemsToSolutions(
    solutions: RawSolution[] | HashedSolution[] | undefined,
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
    return hexHash([...captchaIds.sort(), userAccount, salt].join(''))
}

/**
 * Parse the image items in a captcha and pass back a URI if they exist
 */
export function parseCaptchaAssets(item: Item, assetsResolver: AssetsResolver | undefined) {
    return { ...item, path: assetsResolver?.resolveAsset(item.data).getURL() || item.data }
}
