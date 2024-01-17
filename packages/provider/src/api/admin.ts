import { AdminApiPaths } from '@prosopo/types'
import { BatchCommitmentsTask, Tasks } from '../index.js'
import { ProviderEnvironment } from '@prosopo/types-env'
import { Router } from 'express'
import { authMiddleware } from './authMiddleware.js'

// Setting batch commit interval to 0 for API calls
const apiBatchCommitConfig = {
    interval: 0,
    maxBatchExtrinsicPercentage: 59,
}

export function prosopoAdminRouter(env: ProviderEnvironment): Router {
    const router = Router()
    const tasks = new Tasks(env)

    // Use the authMiddleware for all routes in this router
    router.use(authMiddleware(tasks, env))

    router.post(AdminApiPaths.BatchCommit, async (req, res, next) => {
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

    router.post(AdminApiPaths.UpdateDataset, async (req, res, next) => {
        const jsonFile = req.body
        console.log(jsonFile)
        const result = await tasks.providerSetDataset(jsonFile)

        console.info(`Dataset update complete: ${result}`)
        res.status(200).send(result)
    })

    return router
}
