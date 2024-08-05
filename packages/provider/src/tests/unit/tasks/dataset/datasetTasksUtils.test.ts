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
