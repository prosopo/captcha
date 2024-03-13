import { Payee } from '@prosopo/captcha-contract/types-returns'
import { ProsopoEnvError, UrlConverter } from '@prosopo/common'
import { wrapQuery } from '@prosopo/contract'
import { AdminApiPaths } from '@prosopo/types'
import type { ProviderEnvironment } from '@prosopo/types-env'
import { Router } from 'express'
import * as z from 'zod'
import { BatchCommitmentsTask, Tasks } from '../index.js'
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
            try {
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
            } catch (err) {
                console.error(err)
                res.status(500).send(err)
            }
        } else {
            console.error('No database configured')
            res.status(500).send('No database configured')
        }
    })

    router.post(AdminApiPaths.UpdateDataset, async (req, res, next) => {
        try {
            const result = await tasks.providerSetDataset(req.body)

            console.info(`Dataset update complete: ${result}`)
            res.status(200).send(result)
        } catch (err) {
            console.error(err)
            res.status(500).send(err)
        }
    })

    router.post(AdminApiPaths.ProviderDeregister, async (req, res, next) => {
        try {
            const address = env.pair?.address
            if (!address) {
                throw new ProsopoEnvError('DEVELOPER.MISSING_ENV_VARIABLE', {
                    context: { error: 'No address' },
                })
            }
            await tasks.contract.tx.providerDeregister()
        } catch (err) {
            console.error(err)
            res.status(500).send(err)
        }
    })

    router.post(AdminApiPaths.ProviderUpdate, async (req, res, next) => {
        try {
            const { url, fee, payee, value, address } = z
                .object({
                    url: z.string(),
                    fee: z.number().optional(),
                    payee: z.nativeEnum(Payee).optional(),
                    value: z.number().optional(),
                    address: z.string(),
                })
                .parse(req.body)
            const provider = (
                await tasks.contract.query.getProvider(address, {})
            ).value
                .unwrap()
                .unwrap()
            if (provider && (url || fee || payee || value)) {
                const urlConverted = url
                    ? Array.from(new UrlConverter().encode(url.toString()))
                    : provider.url
                await wrapQuery(
                    tasks.contract.query.providerUpdate,
                    tasks.contract.query
                )(urlConverted, fee || provider.fee, payee || provider.payee, {
                    value: value || 0,
                })
                const result = await tasks.contract.tx.providerUpdate(
                    urlConverted,
                    fee || provider.fee,
                    payee || provider.payee,
                    { value: value || 0 }
                )

                console.info(JSON.stringify(result, null, 2))
            }
        } catch (err) {
            console.error(err)
            res.status(500).send(err)
        }
    })

    return router
}
