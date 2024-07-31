import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProsopoEnvError } from '@prosopo/common'
import { buildDataset } from '@prosopo/datasets'
import { DatasetRaw } from '@prosopo/types'
import { providerValidateDataset } from '../../../../tasks/dataset/datasetTasksUtils.js'

// Mock buildDataset function
vi.mock('@prosopo/datasets', () => ({
    buildDataset: vi.fn(),
}))

describe('providerValidateDataset', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should throw an error if captchas count is less than configured', async () => {
        const datasetRaw = {
            captchas: [],
        } as unknown as DatasetRaw
        const minSolvedCaptchas = 5
        const minUnsolvedCaptchas = 5

        await expect(providerValidateDataset(datasetRaw, minSolvedCaptchas, minUnsolvedCaptchas)).rejects.toThrow(
            new ProsopoEnvError('DATASET.CAPTCHAS_COUNT_LESS_THAN_CONFIGURED', {
                context: { failedFuncName: 'providerValidateDataset' },
            })
        )
    })

    it('should throw an error if solved captchas count is less than configured', async () => {
        const datasetRaw = {
            captchas: [{ solution: null }, { solution: null }, { solution: null }],
        } as unknown as DatasetRaw
        const minSolvedCaptchas = 2
        const minUnsolvedCaptchas = 1

        await expect(providerValidateDataset(datasetRaw, minSolvedCaptchas, minUnsolvedCaptchas)).rejects.toThrow(
            new ProsopoEnvError('DATASET.SOLUTIONS_COUNT_LESS_THAN_CONFIGURED', {
                context: { failedFuncName: 'providerValidateDataset' },
            })
        )
    })

    it('should throw an error if unsolved captchas count is less than configured', async () => {
        const datasetRaw = {
            captchas: [{ solution: 'sol1' }, { solution: 'sol2' }],
        } as unknown as DatasetRaw
        const minSolvedCaptchas = 1
        const minUnsolvedCaptchas = 2

        await expect(providerValidateDataset(datasetRaw, minSolvedCaptchas, minUnsolvedCaptchas)).rejects.toThrow(
            new ProsopoEnvError('DATASET.CAPTCHAS_COUNT_LESS_THAN_CONFIGURED', {
                context: { failedFuncName: 'providerValidateDataset' },
            })
        )
    })

    it('should throw an error if datasetId or datasetContentId is undefined', async () => {
        const datasetRaw = {
            captchas: [{ solution: 'sol1' }, { solution: 'sol2' }],
        } as unknown as DatasetRaw
        const minSolvedCaptchas = 1
        const minUnsolvedCaptchas = 1

        ;(buildDataset as any).mockResolvedValue({
            datasetId: null,
            datasetContentId: null,
        })

        await expect(providerValidateDataset(datasetRaw, minSolvedCaptchas, minUnsolvedCaptchas)).rejects.toThrow(
            new ProsopoEnvError('DATASET.DATASET_ID_UNDEFINED', {
                context: {
                    failedFuncName: 'providerValidateDataset',
                    datasetId: null,
                    datasetContentId: null,
                },
            })
        )
    })

    it('should return the dataset if validation is successful', async () => {
        const datasetRaw = {
            captchas: [{ solution: 'solution' }, {}],
        } as unknown as DatasetRaw
        const minSolvedCaptchas = 1
        const minUnsolvedCaptchas = 1

        const mockDataset = {
            datasetId: 'datasetId',
            datasetContentId: 'datasetContentId',
        }
        ;(buildDataset as any).mockResolvedValue(mockDataset)

        const result = await providerValidateDataset(datasetRaw, minSolvedCaptchas, minUnsolvedCaptchas)

        expect(result).toEqual(mockDataset)
    })
})
