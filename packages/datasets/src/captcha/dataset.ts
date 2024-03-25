import { ProsopoEnvError, getLogger } from '@prosopo/common'
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
import type { Captcha, CaptchaWithoutId, Dataset, DatasetRaw } from '@prosopo/types'
import { at } from '@prosopo/util'
import { computeCaptchaHash, computeItemHash, matchItemsToSolutions } from './captcha.js'
import { CaptchaMerkleTree } from './merkle.js'

const logger = getLogger('Info', 'dataset.ts')

export async function hashDatasetItems(datasetRaw: Dataset | DatasetRaw): Promise<Promise<Captcha>[]> {
    return datasetRaw.captchas.map(async (captcha) => {
        const items = await Promise.all(captcha.items.map(async (item) => computeItemHash(item)))
        return {
            ...captcha,
            items,
        } as Captcha
    })
}

/**
 * Take a dataset and hash all the items, making sure that the existing captchaIds and item hashes are correct
 * @param datasetOriginal
 */
export async function validateDatasetContent(datasetOriginal: Dataset): Promise<boolean> {
    const captchaPromises = await hashDatasetItems(datasetOriginal)
    const captchas = await Promise.all(captchaPromises)
    const dataset = {
        ...datasetOriginal,
        captchas,
    }
    // compare each of the Item hashes in each of the captchas in the dataset to each of the item hashes in each of the
    // captchas in datasetOriginal
    const hashes = dataset.captchas.map((captcha) => {
        const captchaRaw = datasetOriginal.captchas.find((captchaRaw) =>
            'captchaId' in captchaRaw ? captchaRaw.captchaId === captcha.captchaId : false
        )
        if (captchaRaw) {
            return captcha.items.every((item, index) => item.hash === at(captchaRaw.items, index).hash)
        }
        return false
    })

    return hashes.every((hash) => hash)
}

export async function buildDataset(datasetRaw: DatasetRaw): Promise<Dataset> {
    logger.debug('Adding solution hashes to dataset')
    const dataset = await addSolutionHashesToDataset(datasetRaw)
    logger.debug('Building dataset merkle trees')
    const contentTree = await buildCaptchaTree(dataset, false, false, true)
    const solutionTree = await buildCaptchaTree(dataset, true, true, false)
    dataset.captchas = dataset.captchas.map(
        (captcha: CaptchaWithoutId, index: number) =>
            ({
                ...captcha,
                captchaId: at(solutionTree.leaves, index).hash,
                captchaContentId: at(contentTree.leaves, index).hash,
                datasetId: solutionTree.root?.hash,
                datasetContentId: contentTree.root?.hash,
            }) as Captcha
    )
    dataset.solutionTree = solutionTree.layers
    dataset.contentTree = contentTree.layers
    dataset.datasetId = solutionTree.root?.hash
    dataset.datasetContentId = contentTree.root?.hash
    return dataset
}

export async function buildCaptchaTree(
    dataset: Dataset,
    includeSolution: boolean,
    includeSalt: boolean,
    sortItemHashes: boolean
): Promise<CaptchaMerkleTree> {
    try {
        const tree = new CaptchaMerkleTree()
        const datasetWithItemHashes = { ...dataset }
        const captchaHashes = datasetWithItemHashes.captchas.map((captcha) =>
            computeCaptchaHash(captcha, includeSolution, includeSalt, sortItemHashes)
        )
        tree.build(captchaHashes)
        return tree
    } catch (err) {
        throw new ProsopoEnvError('DATASET.HASH_ERROR')
    }
}

export function addSolutionHashesToDataset(datasetRaw: DatasetRaw): Dataset {
    const captchas = datasetRaw.captchas.map((captcha) => {
        return {
            ...captcha,
            items: captcha.items,
            // some captcha challenges will not have a solution
            ...(captcha.solution !== undefined && { solution: matchItemsToSolutions(captcha.solution, captcha.items) }),
        }
    })

    return {
        ...datasetRaw,
        captchas,
    }
}
