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
import { ProsopoServer, getServerConfig } from '@prosopo/server'
import { getPairAsync } from '@prosopo/contract'
import connectionFactory from './utils/connection.js'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import memoryServerSetup from './utils/database.js'
import path from 'path'
import routesFactory from './routes/routes.js'

export function loadEnv() {
    dotenv.config({ path: getEnvFile() })
}

export function getEnvFile(filename = '.env', filepath = './') {
    const env = process.env.NODE_ENV || 'development'
    return path.join(filepath, `${filename}.${env}`)
}

async function main() {
    loadEnv()

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
        throw new Error('No private key found')
    }

    const config = getServerConfig()

    console.log('config', config)
    const pair = await getPairAsync(config.networks[config.defaultNetwork], process.env.PROSOPO_SITE_PRIVATE_KEY)
    const prosopoServer = new ProsopoServer(config, pair)

    app.use(routesFactory(mongoose, prosopoServer))

    app.listen(process.env.PROSOPO_SERVER_PORT)
}

main()
    .then(() => {
        console.log('Server started')
    })
    .catch((err) => {
        console.log(err)
        process.exit()
    })
