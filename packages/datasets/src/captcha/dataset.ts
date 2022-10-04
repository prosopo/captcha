import {

    Dataset,
    DatasetRaw,
    DatasetWithIds,
} from "../types/dataset";
import {
    Captcha,
} from "../types/captcha";

import {
    computeCaptchaHash,
    matchItemsToSolutions,
    calculateItemHashes,
} from "./captcha"
import {CaptchaMerkleTree} from "./merkle"
import {ProsopoEnvError} from '@prosopo/contract'

export async function addCaptchaHashesToDataset(dataset: Dataset, includeSolution: boolean, includeSalt: boolean): Promise<DatasetWithIds> {
    try {
        const tree = new CaptchaMerkleTree();
        const captchaHashes = dataset.captchas.map((captcha) => computeCaptchaHash(captcha, includeSolution, includeSalt));
        tree.build(captchaHashes);
        dataset.captchas = dataset.captchas.map((captcha, index) => (
            {...captcha, captchaId: tree.leaves[index].hash} as Captcha
        ));
        dataset.datasetId = tree.root?.hash;
        dataset.solutionTree = tree.layers;
        return <DatasetWithIds>dataset;
    } catch (err) {
        throw new ProsopoEnvError("DATASET.HASH_ERROR");
    }
}

export async function addItemHashesAndSolutionHashesToDataset(datasetRaw: DatasetRaw): Promise<Dataset> {
    return {
        ...datasetRaw,
        captchas: datasetRaw.captchas.map((captcha) => {
            const items = calculateItemHashes(captcha.items);

            return {
                ...captcha,
                items,
                solution: matchItemsToSolutions(captcha.solution, items),
            };
        }),
    } as Dataset
}
