// Copyright 2021-2023 Prosopo (UK) Ltd.
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
import { Server } from 'http'
import { getDB, getSecret } from './process.env.js'
import { getPairAsync } from '@prosopo/contract'
import { loadEnv } from './env.js'
import { prosopoRouter } from '@prosopo/provider'
import cors from 'cors'
import esMain from 'es-main'
import express, { NextFunction, Request, Response } from 'express'
import getConfig from './prosopo.config.js'

let apiAppSrv: Server

export const handleErrors = (err: ProsopoApiError, req: Request, res: Response, next: NextFunction) => {
    let message = err.message
    try {
        message = JSON.parse(err.message)
    } catch {
        console.debug('Invalid JSON error message')
    }
    return res.status(err.code).json({
        message,
        name: err.name,
    })
}

function startApi(env: ProviderEnvironment) {
    env.logger.info(`Starting Prosopo API`)
    const apiApp = express()
    const apiPort = env.config.server.port

    apiApp.use(cors())
    apiApp.use(express.json())
    apiApp.use(i18nMiddleware({}))
    apiApp.use(prosopoRouter(env))

    apiApp.use(handleErrors)
    apiAppSrv = apiApp.listen(apiPort, () => {
        env.logger.info(`Prosopo app listening at http://localhost:${apiPort}`)
    })
}

export async function start(env?: ProviderEnvironment) {
    if (!env) {
        loadEnv()

        // Fail to start api if db is not defined
        getDB()

        const secret = getSecret()
        const config = getConfig()
        const pair = await getPairAsync(config.networks[config.defaultNetwork], secret, '')
        env = new ProviderEnvironment(pair, config)
    }
    await env.isReady()
    startApi(env)
}

function stop() {
    apiAppSrv.close()
}
//if main process
if (esMain(import.meta)) {
    start().catch((error) => {
        console.error(error)
    })
}
