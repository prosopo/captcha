import { ProsopoEnvError } from '@prosopo/common'
import { buildDataset } from '@prosopo/datasets'
import { DatasetRaw } from '@prosopo/types'

export const providerValidateDataset = async (
    datasetRaw: DatasetRaw,
    minSolvedCaptchas: number,
    minUnsolvedCaptchas: number
) => {
    // Check that the number of captchas in the dataset is greater or equal to min number of solved captchas
    if (datasetRaw.captchas.length < minSolvedCaptchas + minUnsolvedCaptchas) {
        throw new ProsopoEnvError('DATASET.CAPTCHAS_COUNT_LESS_THAN_CONFIGURED', {
            context: { failedFuncName: providerValidateDataset.name },
        })
    }

    const solutions = datasetRaw.captchas
        .map((captcha): number => (captcha.solution ? 1 : 0))
        .reduce((partialSum, b) => partialSum + b, 0)

    // Check enough solved captchas
    if (solutions < minSolvedCaptchas) {
        throw new ProsopoEnvError('DATASET.SOLUTIONS_COUNT_LESS_THAN_CONFIGURED', {
            context: { failedFuncName: providerValidateDataset.name },
        })
    }

    // Check enough unsolved captchas
    if (solutions < minUnsolvedCaptchas) {
        throw new ProsopoEnvError('DATASET.SOLUTIONS_COUNT_LESS_THAN_CONFIGURED', {
            context: { failedFuncName: providerValidateDataset.name },
        })
    }

    const dataset = await buildDataset(datasetRaw)

    // Check DSetID and DSetContentID are defined
    if (!dataset.datasetId || !dataset.datasetContentId) {
        throw new ProsopoEnvError('DATASET.DATASET_ID_UNDEFINED', {
            context: {
                failedFuncName: providerValidateDataset.name,
                datasetId: dataset.datasetId,
                datasetContentId: dataset.datasetContentId,
            },
        })
    }

    return dataset
}
