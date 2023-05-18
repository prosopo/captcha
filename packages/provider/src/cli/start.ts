// Copyright 2021-2022 Prosopo (UK) Ltd.
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
import { getPair, i18nMiddleware } from '@prosopo/common'
import { getPairType, getSecret, getSs58Format, loadEnv } from '@prosopo/env'
import { ProsopoEnvironment } from '@prosopo/types-env'
import cors from 'cors'
import express from 'express'
import { Server } from 'http'
import { prosopoRouter } from '../api'
import { LocalAssetsResolver } from '../assets'
import { Environment } from '../env'
import { handleErrors } from '../errors'

let apiAppSrv: Server

function startApi(env: ProsopoEnvironment) {
    const apiApp = express()
    const apiPort = process.env.API_PORT || 3000

    apiApp.use(cors())
    apiApp.use(express.json())
    apiApp.use(i18nMiddleware({}))
    apiApp.use(prosopoRouter(env))

    if (env.assetsResolver instanceof LocalAssetsResolver) {
        env.assetsResolver.injectMiddleware(apiApp) //
    }

    apiApp.use(handleErrors)
    apiAppSrv = apiApp.listen(apiPort, () => {
        env.logger.info(`Prosopo app listening at http://localhost:${apiPort}`)
    })
}

function startFileSrv(port: number | string, locations: string[]) {
    const app = express()

    locations.forEach((loc) => {
        // allow local filesystem lookup at each location
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

    let env: ProsopoEnvironment

    if (nodeEnv !== 'test') {
        const ss58Format = getSs58Format()
        const pairType = getPairType()
        const secret = getSecret()
        const pair = await getPair(pairType, ss58Format, secret)

        env = new Environment(pair)
    } else {
        // env = new MockEnvironment();
        return
    }

    await env.isReady()
    startApi(env)

    // set up the file server
    const port = process.env.FILE_SRV_PORT || 4000
    // accept multiple paths for locations of files
    const paths = JSON.parse(process.env.FILE_SRV_PATHS || '[]')
    // if single path given convert to array
    const locations = Array.isArray(paths) ? paths : [paths]
    startFileSrv(port, locations)
}

function stop() {
    apiAppSrv.close()
}

start(process.env.NODE_ENV || 'development').catch((error) => {
    console.error(error)
})
