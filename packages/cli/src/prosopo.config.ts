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

import { getLogLevel } from '@prosopo/common'
import {
    type BatchCommitConfigSchema,
    DatabaseTypes,
    EnvironmentTypesSchema,
    NetworkNamesSchema,
    type ProsopoCaptchaCountConfigSchemaInput,
    type ProsopoCaptchaSolutionConfigSchema,
    type ProsopoConfigInput,
    type ProsopoConfigOutput,
    ProsopoConfigSchema,
    type ProsopoNetworksSchemaInput,
} from '@prosopo/types'
import { getSecret } from './process.env.js'

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
    captchaServeConfig?: ProsopoCaptchaCountConfigSchemaInput
): ProsopoConfigOutput {
    return ProsopoConfigSchema.parse({
        logLevel: getLogLevel(),
        defaultEnvironment: process.env.PROSOPO_DEFAULT_ENVIRONMENT
            ? EnvironmentTypesSchema.parse(process.env.PROSOPO_DEFAULT_ENVIRONMENT)
            : EnvironmentTypesSchema.enum.development,
        defaultNetwork: process.env.PROSOPO_DEFAULT_NETWORK
            ? NetworkNamesSchema.parse(process.env.PROSOPO_DEFAULT_NETWORK)
            : NetworkNamesSchema.enum.development,
        account: {
            address: process.env.PROSOPO_PROVIDER_ADDRESS || undefined,
            password: process.env.PROSOPO_PROVIDER_ACCOUNT_PASSWORD || undefined,
            secret: getSecret(),
        },
        database: {
            development: {
                type: DatabaseTypes.enum.mongo,
                endpoint: getMongoURI(),
                dbname: process.env.PROSOPO_DATABASE_NAME || '',
                authSource: 'admin',
            },
            production: {
                type: DatabaseTypes.enum.mongo,
                endpoint: getMongoURI(),
                dbname: process.env.PROSOPO_DATABASE_NAME || '',
                authSource: 'admin',
            },
        },
        server: {
            baseURL: process.env.PROSOPO_API_BASE_URL || 'http://localhost',
            port: process.env.PROSOPO_API_PORT ? Number.parseInt(process.env.PROSOPO_API_PORT) : 9229,
        },
        networks: networksConfig,
        captchaSolutions: captchaSolutionsConfig,
        batchCommit: batchCommitConfig,
        captchas: captchaServeConfig,
        devOnlyWatchEvents: process.env._DEV_ONLY_WATCH_EVENTS === 'true',
        mongoEventsUri: process.env.PROSOPO_MONGO_EVENTS_URI || '',
    } as ProsopoConfigInput)
}
