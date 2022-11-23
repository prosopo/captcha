import { Dataset, DatasetRaw } from '../types/dataset'
import { Captcha, HashedItem } from '../types/captcha'
import { calculateItemHashes, computeCaptchaHash, computeItemHash, matchItemsToSolutions } from './captcha'
import { CaptchaMerkleTree } from './merkle'
import { ProsopoEnvError } from '../types/error'

export async function buildDataset(datasetRaw: DatasetRaw): Promise<Dataset> {
    const dataset = await addItemHashesAndSolutionHashesToDataset(datasetRaw)
    const contentTree = await buildCaptchaTree(dataset, false, false, true)
    const solutionTree = await buildCaptchaTree(dataset, true, true, false)
    dataset.captchas = dataset.captchas.map(
        (captcha, index) =>
            ({
                ...captcha,
                captchaId: solutionTree.leaves[index].hash,
                captchaContentId: contentTree.leaves[index].hash,
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
        const datasetWithItemHashes = await Promise.all(
            dataset.captchas.map(
                async (captcha): Promise<HashedItem> => ({
                    ...captcha,
                    items: captcha.items.map(async (item) => ({ ...item, hash: await computeItemHash(item) })),
                })
            )
        )
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
    return {
        ...datasetRaw,
        captchas: await Promise.all(
            datasetRaw.captchas.map(async (captcha) => {
                const items = await calculateItemHashes(captcha.items)

                return {
                    ...captcha,
                    items,
                    solution: matchItemsToSolutions(captcha.solution, items),
                }
            })
        ),
    } as Dataset
}
