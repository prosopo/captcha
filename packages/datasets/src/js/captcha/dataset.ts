import { Dataset, DatasetRaw } from '@prosopo/types'
import { Captcha, CaptchaWithoutId } from '@prosopo/types'
import { computeCaptchaHash, computeItemHash, matchItemsToSolutions } from './captcha'
import { CaptchaMerkleTree } from './merkle'
import { ProsopoEnvError } from '@prosopo/common'

export async function buildDataset(datasetRaw: DatasetRaw): Promise<Dataset> {
    const dataset = await addItemHashesAndSolutionHashesToDataset(datasetRaw)
    // console.log(dataset.captchas[0])
    // dataset.captchas.map((captcha: CaptchaWithoutId) => {
    //     if (captcha.target === 'car') {
    //         console.log(captcha)
    //     }
    // })
    // process.exit(0)
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
    return {
        ...datasetRaw,
        captchas: await Promise.all(
            datasetRaw.captchas.map(async (captcha) => {
                const items = await Promise.all(captcha.items.map(async (item) => await computeItemHash(item)))

                return {
                    ...captcha,
                    items,
                    // some captcha challenges will not have a solution
                    ...(captcha.solution !== undefined && { solution: matchItemsToSolutions(captcha.solution, items) }),
                }
            })
        ),
    } as Dataset
}
