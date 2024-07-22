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
import * as z from 'zod'
import { AdminApiPaths } from '@prosopo/types'
import { Tasks } from '../index.js'
import { Payee } from '@prosopo/captcha-contract/types-returns'
import { ProsopoEnvError, UrlConverter } from '@prosopo/common'
import { ProviderEnvironment } from '@prosopo/types-env'
import { Router } from 'express'
import { authMiddleware } from './authMiddleware.js'
import { wrapQuery } from '@prosopo/contract'

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
                throw new ProsopoEnvError('DEVELOPER.MISSING_ENV_VARIABLE', { context: { error: 'No address' } })
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
            const provider = (await tasks.contract.query.getProvider(address, {})).value.unwrap().unwrap()
            if (provider && (url || fee || payee || value)) {
                const urlConverted = url ? Array.from(new UrlConverter().encode(url.toString())) : provider.url
                await wrapQuery(tasks.contract.query.providerUpdate, tasks.contract.query)(
                    urlConverted,
                    fee || provider.fee,
                    payee || provider.payee,
                    { value: value || 0 }
                )
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
