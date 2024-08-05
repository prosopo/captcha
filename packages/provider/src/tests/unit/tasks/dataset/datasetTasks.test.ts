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
import { ProsopoConfigOutput, CaptchaConfig, DatasetRaw, StoredEvents } from '@prosopo/types'
import { Logger } from '@prosopo/common'
import { Database } from '@prosopo/types-database'
import { saveCaptchaEvent, saveCaptchas } from '@prosopo/database'
import { parseCaptchaDataset } from '@prosopo/datasets'
import { DatasetManager } from '../../../../tasks/dataset/datasetTasks.js'

vi.mock('@prosopo/database', () => ({
    saveCaptchaEvent: vi.fn(),
    saveCaptchas: vi.fn(),
}))

vi.mock('@prosopo/datasets', () => ({
    parseCaptchaDataset: vi.fn(),
}))

// Import directly and mock the function
import * as datasetTasksUtils from '../../../../tasks/dataset/datasetTasksUtils.js'
vi.spyOn(datasetTasksUtils, 'providerValidateDataset')

describe('DatasetManager', () => {
    let config: ProsopoConfigOutput
    let logger: Logger
    let captchaConfig: CaptchaConfig
    let db: Database
    let datasetManager: DatasetManager

    beforeEach(() => {
        config = {
            devOnlyWatchEvents: true,
            mongoEventsUri: 'mongodb://localhost:27017/events',
            mongoCaptchaUri: 'mongodb://localhost:27017/captchas',
        } as ProsopoConfigOutput

        logger = {
            info: vi.fn(),
            error: vi.fn(),
        } as unknown as Logger

        captchaConfig = {
            solved: { count: 5 },
            unsolved: { count: 5 },
        } as CaptchaConfig

        db = {
            storeDataset: vi.fn(),
            getUnstoredDappUserCommitments: vi.fn().mockResolvedValue([]),
            markDappUserCommitmentsStored: vi.fn(),
        } as unknown as Database

        datasetManager = new DatasetManager(config, logger, captchaConfig, db)
        vi.clearAllMocks()
    })

    it('should set the provider dataset from a file', async () => {
        const mockFile = { captchas: [] }
        const mockDatasetRaw = { captchas: [], format: 'SelectAll' } as DatasetRaw
        const mockValidatedDataset = { datasetId: '123', datasetContentId: '456' }

        ;(parseCaptchaDataset as any).mockReturnValue(mockDatasetRaw)
        ;(datasetTasksUtils.providerValidateDataset as any).mockResolvedValue(mockValidatedDataset)

        await datasetManager.providerSetDatasetFromFile(mockFile as unknown as JSON)

        expect(parseCaptchaDataset).toHaveBeenCalledWith(mockFile)
        expect(datasetTasksUtils.providerValidateDataset).toHaveBeenCalledWith(
            mockDatasetRaw,
            captchaConfig.solved.count,
            captchaConfig.unsolved.count
        )
        expect(db.storeDataset).toHaveBeenCalledWith(mockValidatedDataset)
    })

    it('should not save captcha event if devOnlyWatchEvents is not true', async () => {
        config.devOnlyWatchEvents = false
        const events = { events: [] } as StoredEvents
        const accountId = 'account123'

        await datasetManager.saveCaptchaEvent(events, accountId)

        expect(logger.info).toHaveBeenCalledWith('Dev watch events not set to true, not saving events')
        expect(saveCaptchaEvent).not.toHaveBeenCalled()
    })

    it('should save captcha event if devOnlyWatchEvents is true', async () => {
        const events = { events: [] } as StoredEvents
        const accountId = 'account123'

        await datasetManager.saveCaptchaEvent(events, accountId)

        expect(saveCaptchaEvent).toHaveBeenCalledWith(events, accountId, config.mongoEventsUri)
    })

    it('should not store commitments externally if mongoCaptchaUri is not set', async () => {
        config.mongoCaptchaUri = undefined

        await datasetManager.storeCommitmentsExternal()

        expect(logger.info).toHaveBeenCalledWith('Mongo env not set')
        expect(db.getUnstoredDappUserCommitments).not.toHaveBeenCalled()
    })

    it('should store commitments externally if mongoCaptchaUri is set', async () => {
        const mockCommitments = [{ id: 'commitment1' }]
        ;(db.getUnstoredDappUserCommitments as any).mockResolvedValue(mockCommitments)

        await datasetManager.storeCommitmentsExternal()

        expect(db.getUnstoredDappUserCommitments).toHaveBeenCalled()
        expect(saveCaptchas).toHaveBeenCalledWith(mockCommitments, config.mongoCaptchaUri)
        expect(db.markDappUserCommitmentsStored).toHaveBeenCalledWith(mockCommitments.map((c) => c.id))
    })
})
