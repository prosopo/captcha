import { AccountKey } from '../tests/dataUtils/DatabaseAccounts.js'
import { AdminApiPaths } from '@prosopo/types'
import { BatchCommitmentsTask, Tasks } from '../index.js'
import { ProviderEnvironment } from '@prosopo/types-env'
import { Router } from 'express'
import { UserCount, UserFund } from '../tests/dataUtils/populateDatabase.js'
import { authMiddleware } from './authMiddleware.js'

// Setting batch commit interval to 0 for API calls
const apiBatchCommitConfig = {
    interval: 0,
    maxBatchExtrinsicPercentage: 59,
}

const DEFAULT_USER_COUNT: UserCount = {
    [AccountKey.providers]: 20,
    [AccountKey.providersWithStake]: 20,
    [AccountKey.providersWithStakeAndDataset]: 20,
    [AccountKey.dapps]: 20,
    [AccountKey.dappsWithStake]: 20,
    [AccountKey.dappUsers]: 0,
}

const userFundMapDefault: UserFund = {
    [AccountKey.providers]: true,
    [AccountKey.providersWithStake]: true,
    [AccountKey.providersWithStakeAndDataset]: true,
    [AccountKey.dapps]: true,
    [AccountKey.dappsWithStake]: true,
    [AccountKey.dappUsers]: true,
}

export function prosopoAdminRouter(env: ProviderEnvironment): Router {
    const router = Router()
    const tasks = new Tasks(env)

    // Use the authMiddleware for all routes in this router
    router.use(authMiddleware(tasks, env))

    router.post(AdminApiPaths.BatchCommit, async (req, res, next) => {
        // Code for potentially populating db:

        // const dappAbiMetadata = await DappAbiJSON()
        // const dappWasm = await DappWasm()

        // await populateDatabase(
        //     new ProviderEnvTest(env.config, env.pair),
        //     DEFAULT_USER_COUNT,
        //     userFundMapDefault,
        //     true,
        //     dappAbiMetadata,
        //     dappWasm
        // )

        if (env.db) {
            const batchCommitter = new BatchCommitmentsTask(
                apiBatchCommitConfig,
                env.getContractInterface(),
                env.db,
                0n,
                env.logger
            )
            const result = await batchCommitter.run()
            console.info(`Batch commit complete: ${result}`)
            res.status(200).send(result)
        } else {
            console.error('No database configured')
            res.status(500).send('No database configured')
        }
    })

    return router
}
