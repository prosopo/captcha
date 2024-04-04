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
import { ProsopoApiError, i18nMiddleware } from '@prosopo/common'
import { ProviderEnvironment } from '@prosopo/env'
import { Server } from 'node:net'
import { getDB, getSecret } from './process.env.js'
import { getPairAsync } from '@prosopo/contract'
import { loadEnv } from './env.js'
import { prosopoAdminRouter, prosopoRouter } from '@prosopo/provider'
import cors from 'cors'
import express, { NextFunction, Request, Response } from 'express'
import getConfig from './prosopo.config.js'

// We need the unused params to make express recognise this function as an error handler
export const handleErrors = (
    err: ProsopoApiError | SyntaxError,
    request: Request,
    response: Response,
    next: NextFunction
) => {
    const code = 'code' in err ? err.code : 400
    let message = err.message
    try {
        message = JSON.parse(err.message)
    } catch {
        console.debug('Invalid JSON error message')
    }
    return response.status(code).json({
        message,
        name: err.name,
    })
}

function startApi(env: ProviderEnvironment, admin = false): Server {
    env.logger.info(`Starting Prosopo API`)
    const apiApp = express()
    const apiPort = env.config.server.port

    apiApp.use(cors())
    apiApp.use(express.json({ limit: '50mb' }))
    apiApp.use(i18nMiddleware({}))
    apiApp.use(prosopoRouter(env))
    apiApp.use(handleErrors)

    if (admin) {
        apiApp.use(prosopoAdminRouter(env))
    }

    return apiApp.listen(apiPort, () => {
        env.logger.info(`Prosopo app listening at http://localhost:${apiPort}`)
    })
}

export async function start(env?: ProviderEnvironment, admin?: boolean) {
    if (!env) {
        loadEnv()

        // Fail to start api if db is not defined
        getDB()

        const secret = getSecret()
        const config = getConfig(undefined, undefined, undefined, {
            solved: { count: 2 },
            unsolved: { count: 0 },
        })
        const pair = await getPairAsync(config.networks[config.defaultNetwork], secret, '')
        env = new ProviderEnvironment(config, pair)
    }
    await env.isReady()
    return startApi(env, admin)
}
