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
import { ProsopoApiError, getPair, i18nMiddleware } from '@prosopo/common'
import { ProviderEnvironment } from '@prosopo/env'
import { Server } from 'http'
import { getConfig, getPairType, getSecret, getSs58Format } from './process.env'
import { loadEnv } from './env'
import { prosopoRouter } from '@prosopo/provider'
import cors from 'cors'
import express from 'express'

let apiAppSrv: Server

export const handleErrors = (err: ProsopoApiError, req, res, next) => {
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

function startFileSrv(port: number | string, locations: string[]) {
    const app = express()

    locations.forEach((loc) => {
        // allow local filesystem lookup at each location
        // http://localhost:3000/a.jpg
        // serve path set to /
        // url: pronode1.duckdns.org/img/a.jpg
        // serve path set to /img
        // url: pronode1.duckdns.org/a.jpg`
        app.use('/', express.static(loc))
    })

    // only run server if locations have been specified
    if (locations.length > 0) {
        app.listen(port, () => {
            console.log(`File server running on port ${port} serving [${locations}]`)
        })
    }
}

async function start(nodeEnv: string) {
    loadEnv()

    const ss58Format = getSs58Format()
    const pairType = getPairType()
    const secret = getSecret()
    const config = getConfig()
    const pair = await getPair(pairType, ss58Format, secret)

    const env = new ProviderEnvironment(pair, config)

    await env.isReady()
    startApi(env)

    // set up the file server
    const port = env.config.server.port
    // accept multiple paths for locations of files
    const paths = env.config.server.fileServePaths
    // if single path given convert to array
    const parsed: string | string[] = JSON.parse(paths)
    const locations = Array.isArray(parsed) ? parsed : [parsed]
    startFileSrv(port, locations)
}

function stop() {
    apiAppSrv.close()
}
//if main process
if (typeof require !== undefined && require.main === module) {
    start(process.env.NODE_ENV || 'development').catch((error) => {
        console.error(error)
    })
}
