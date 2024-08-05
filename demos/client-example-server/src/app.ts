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
import { ProsopoEnvError, getLoggerDefault } from '@prosopo/common'
import { at } from '@prosopo/util'
import { getServerConfig } from '@prosopo/server'
import connectionFactory from './utils/connection.js'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import memoryServerSetup from './utils/database.js'
import path from 'node:path'
import routesFactory from './routes/routes.js'

export function loadEnv() {
    dotenv.config({ path: getEnvFile() })
}

export function getEnvFile(filename = '.env', filepath = './') {
    const env = process.env.NODE_ENV || 'development'
    return path.join(filepath, `${filename}.${env}`)
}

enum ProsopoVerificationType {
    api = 'api',
    local = 'local',
}

async function main() {
    const logger = getLoggerDefault()
    loadEnv()

    const verifyEndpoint = process.env.PROSOPO_VERIFY_ENDPOINT || 'https://api.prosopo.io/siteverify'

    const verifyType: ProsopoVerificationType = Object.keys(ProsopoVerificationType).includes(
        process.env.PROSOPO_VERIFICATION_TYPE as string
    )
        ? (process.env.PROSOPO_VERIFICATION_TYPE as ProsopoVerificationType)
        : ProsopoVerificationType.api

    const app = express()

    app.use(cors({ origin: true, credentials: true }))

    app.use(express.urlencoded({ extended: true }))

    app.use(express.json())

    app.use((_, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE')
        res.setHeader('Access-Control-Allow-Headers', 'Origin, Content-Type, X-Auth-Token, Authorization')
        next()
    })

    app.options('/*', (_, res) => {
        res.sendStatus(200)
    })

    const uri = await memoryServerSetup()
    console.log('mongo uri', uri)
    const mongoose = connectionFactory(uri)
    if (!process.env.PROSOPO_SITE_PRIVATE_KEY) {
        const mnemonicError = new ProsopoEnvError('GENERAL.MNEMONIC_UNDEFINED', {
            context: { missingParams: ['PROSOPO_SITE_PRIVATE_KEY'] },
            logger,
        })

        logger.error(mnemonicError)
    }

    const config = getServerConfig()

    console.log('Config', config)

    app.use(routesFactory(mongoose, config, verifyEndpoint, verifyType))

    app.listen(config.serverUrl ? Number.parseInt(at(config.serverUrl.split(':'), 2)) : 9228)
}

main()
    .then(() => {
        console.log('Server started')
    })
    .catch((err) => {
        console.log(err)
        process.exit()
    })
