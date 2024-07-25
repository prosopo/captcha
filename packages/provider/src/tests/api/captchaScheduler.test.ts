import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CronJob } from 'cron'
import { KeyringPair } from '@polkadot/keyring/types'
import { ProsopoConfigOutput } from '@prosopo/types'
import { ProsopoEnvError } from '@prosopo/common'
import { ProviderEnvironment } from '@prosopo/env'
import { storeCaptchasExternally } from '../../api/captchaScheduler.js'
import { Tasks } from '../../tasks/tasks.js'

// Mock dependencies
vi.mock('@prosopo/env', () => ({
    ProviderEnvironment: vi.fn().mockImplementation(() => ({
        isReady: vi.fn().mockResolvedValue(true),
        logger: {
            log: vi.fn(),
            error: vi.fn(),
        },
        db: {},
    })),
}))

vi.mock('../../tasks/tasks.js', () => ({
    Tasks: vi.fn().mockImplementation(() => ({
        datasetManager: {
            storeCommitmentsExternal: vi.fn().mockResolvedValue(undefined),
        },
    })),
}))

vi.mock('cron', () => ({
    CronJob: vi.fn().mockImplementation((cronTime, onTick) => ({
        start: vi.fn().mockImplementation(onTick),
    })),
}))

describe('storeCaptchasExternally', () => {
    let mockPair: KeyringPair
    let mockConfig: ProsopoConfigOutput

    beforeEach(() => {
        mockPair = {} as KeyringPair
        mockConfig = {} as ProsopoConfigOutput
    })

    it('should initialize environment and start cron job', async () => {
        await storeCaptchasExternally(mockPair, mockConfig)

        expect(ProviderEnvironment).toHaveBeenCalledWith(mockConfig, mockPair)
        expect(Tasks).toHaveBeenCalled()
        expect(CronJob).toHaveBeenCalledWith('0 * * * *', expect.any(Function))
    })

    it('should throw an error if db is undefined', async () => {
        ;(ProviderEnvironment as any).mockImplementationOnce(() => ({
            isReady: vi.fn().mockResolvedValue(true),
            logger: {
                log: vi.fn(),
                error: vi.fn(),
            },
            db: undefined,
        }))

        await expect(storeCaptchasExternally(mockPair, mockConfig)).rejects.toThrow(ProsopoEnvError)
    })

    it('should log message when cron job runs', async () => {
        await storeCaptchasExternally(mockPair, mockConfig)

        const envInstance = (ProviderEnvironment as any).mock.results[0].value
        expect(envInstance.logger.log).toHaveBeenCalledWith('storeCommitmentsExternal task....')
    })
})
