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

import {
    BatchCommitConfigSchema,
    DatabaseTypes,
    ProsopoCaptchaCountConfigSchemaInput,
    ProsopoCaptchaSolutionConfigSchema,
    ProsopoConfigInput,
    ProsopoConfigOutput,
    ProsopoConfigSchema,
    ProsopoNetworksSchemaInput,
} from '@prosopo/types'
import {
    getAddress,
    getApiBaseUrl,
    getApiPort,
    getDatabaseName,
    getDevOnlyWatchEventsFlag,
    getEnvironment,
    getMongoAtlasURI,
    getNetwork,
    getPassword,
    getSecret,
} from './process.env.js'
import { getLogLevel } from '@prosopo/common'

function getMongoURI(): string {
    const protocol = process.env.PROSOPO_DATABASE_PROTOCOL || 'mongodb'
    const mongoSrv = protocol === 'mongodb+srv'
    const password = process.env.PROSOPO_DATABASE_PASSWORD || ''
    const username = process.env.PROSOPO_DATABASE_USERNAME || ''
    const host = process.env.PROSOPO_DATABASE_HOST || 'localhost'
    const port = mongoSrv ? '' : `:${process.env.PROSOPO_DATABASE_PORT ? process.env.PROSOPO_DATABASE_PORT : 27017}`
    const retries = mongoSrv ? '?retryWrites=true&w=majority' : ''
    return `${protocol}://${username}:${password}@${host}${port}/${retries}`
}

export default function getConfig(
    networksConfig?: ProsopoNetworksSchemaInput,
    captchaSolutionsConfig?: typeof ProsopoCaptchaSolutionConfigSchema,
    batchCommitConfig?: typeof BatchCommitConfigSchema,
    captchaServeConfig?: ProsopoCaptchaCountConfigSchemaInput,
    who = 'PROVIDER'
): ProsopoConfigOutput {
    return ProsopoConfigSchema.parse({
        logLevel: getLogLevel(),
        defaultEnvironment: getEnvironment(),
        defaultNetwork: getNetwork(),
        account: {
            address: getAddress(who),
            password: getPassword(who),
            secret: getSecret(who),
        },
        database: {
            development: {
                type: DatabaseTypes.enum.mongo,
                endpoint: getMongoURI(),
                dbname: getDatabaseName(),
                authSource: 'admin',
            },
            production: {
                type: DatabaseTypes.enum.mongo,
                endpoint: getMongoURI(),
                dbname: getDatabaseName(),
                authSource: 'admin',
            },
        },
        server: {
            baseURL: getApiBaseUrl(),
            port: getApiPort(),
        },
        networks: networksConfig,
        captchaSolutions: captchaSolutionsConfig,
        batchCommit: batchCommitConfig,
        captchas: captchaServeConfig,
        devOnlyWatchEvents: getDevOnlyWatchEventsFlag(),
        mongoEventsUri: getMongoAtlasURI(),
    } as ProsopoConfigInput)
}
