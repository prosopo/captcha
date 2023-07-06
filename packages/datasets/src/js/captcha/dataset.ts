import { Captcha, CaptchaWithoutId, Dataset, DatasetRaw } from '@prosopo/types'
import { CaptchaMerkleTree } from './merkle'
import { ProsopoEnvError } from '@prosopo/common'
import { computeCaptchaHash, computeItemHash, matchItemsToSolutions } from './captcha'
import cliProgress from 'cli-progress'

export async function hashDatasetItems(datasetRaw: Dataset | DatasetRaw): Promise<Dataset> {
    const captchaPromises = datasetRaw.captchas.map(async (captcha) => {
        const items = await Promise.all(captcha.items.map(async (item) => computeItemHash(item)))
        return {
            ...captcha,
            items,
        } as Captcha
    })
    const captchas = await trackPromisesProgress<Captcha>(captchaPromises)
    return {
        ...datasetRaw,
        captchas,
    }
}

/**
 * Take a dataset and hash all the items, making sure that the existing captchaIds and item hashes are correct
 * @param datasetOriginal
 */
export async function validateDatasetContent(datasetOriginal: Dataset): Promise<boolean> {
    const dataset = await hashDatasetItems(datasetOriginal)
    // compare each of the Item hashes in each of the captchas in the dataset to each of the item hashes in each of the
    // captchas in datasetOriginal
    const hashes = dataset.captchas.map((captcha) => {
        const captchaRaw = datasetOriginal.captchas.find((captchaRaw) =>
            'captchaId' in captchaRaw ? captchaRaw.captchaId === captcha.captchaId : false
        )
        if (captchaRaw) {
            return captcha.items.every((item, index) => item.hash === captchaRaw.items[index].hash)
        } else {
            return false
        }
    })

    return hashes.every((hash) => hash)
}

export async function buildDataset(dataset: Dataset): Promise<Dataset> {
    const contentTree = await buildCaptchaTree(dataset, false, false, true)
    const solutionTree = await buildCaptchaTree(dataset, true, true, false)
    dataset.captchas = dataset.captchas.map(
        (captcha: CaptchaWithoutId, index: number) =>
            ({
                ...captcha,
                captchaId: solutionTree.leaves[index].hash,
                captchaContentId: contentTree.leaves[index].hash,
                datasetId: solutionTree.root?.hash,
                datasetContentId: contentTree.root?.hash,
            } as Captcha)
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

export async function addItemHashesAndSolutionHashesToDataset(datasetRaw: DatasetRaw): Promise<Dataset> {
    const captchaPromises = datasetRaw.captchas.map(async (captcha) => {
        //const items = await Promise.all(captcha.items.map(async (item) => await computeItemHash(item)))
        return {
            ...captcha,
            items: captcha.items,
            // some captcha challenges will not have a solution
            ...(captcha.solution !== undefined && { solution: matchItemsToSolutions(captcha.solution, captcha.items) }),
        }
    })

    const captchas = await trackPromisesProgress<CaptchaWithoutId | Captcha>(captchaPromises)

    return {
        ...datasetRaw,
        captchas,
    }
}

export async function trackPromisesProgress<T>(promisesArray: Promise<T>[]): Promise<T[]> {
    let doneCount = 0
    const bar = new cliProgress.SingleBar({ forceRedraw: true }, cliProgress.Presets.shades_classic)
    // start the progress bar with a total value of promisesArray.length and start value of 0
    bar.start(promisesArray.length, doneCount)

    const handleProgress = (result: T) => {
        doneCount++
        // bar.update does not work here
        bar.start(promisesArray.length, doneCount)
        return result
    }

    return await Promise.all(promisesArray.map((p) => p.then(handleProgress))).then((results: T[]): T[] => {
        bar.stop()
        return results
    })
}
