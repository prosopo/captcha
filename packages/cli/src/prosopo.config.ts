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

import {
    BatchCommitConfigSchema,
    DatabaseTypes,
    EnvironmentTypesSchema,
    NetworkNamesSchema,
    ProsopoCaptchaCountConfigSchema,
    ProsopoCaptchaSolutionConfigSchema,
    ProsopoConfigInput,
    ProsopoConfigSchema,
    ProsopoNetworksSchema,
    ProsopoNetworksSchemaInput,
} from '@prosopo/types'
import { getLogLevel } from '@prosopo/common'

function getMongoURI(): string {
    const protocol = process.env.DATABASE_PROTOCOL || 'mongodb'
    const mongoSrv = protocol === 'mongodb+srv'
    const password = process.env.DATABASE_PASSWORD || ''
    const username = process.env.DATABASE_USERNAME || ''
    const host = process.env.DATABASE_HOST || 'localhost'
    const port = mongoSrv ? '' : `:${process.env.DATABASE_PORT ? process.env.DATABASE_PORT : 27017}`
    const retries = mongoSrv ? '?retryWrites=true&w=majority' : ''
    return `${protocol}://${username}:${password}@${host}${port}/${retries}`
}

export default (
    networksConfig?: ProsopoNetworksSchemaInput,
    captchaSolutionsConfig?: typeof ProsopoCaptchaSolutionConfigSchema,
    batchCommitConfig?: typeof BatchCommitConfigSchema,
    captchaServeConfig?: typeof ProsopoCaptchaCountConfigSchema
): ProsopoConfigInput =>
    ProsopoConfigSchema.parse({
        logLevel: getLogLevel(),
        defaultEnvironment: process.env.DEFAULT_ENVIRONMENT
            ? EnvironmentTypesSchema.parse(process.env.DEFAULT_ENDPOINT)
            : EnvironmentTypesSchema.enum.development,
        defaultNetwork: process.env.DEFAULT_NETWORK
            ? NetworkNamesSchema.parse(process.env.DEFAULT_NETWORK)
            : NetworkNamesSchema.enum.development,
        account: {
            address: process.env.PROVIDER_ADDRESS || '',
            password: process.env.PROVIDER_ACCOUNT_PASSWORD || undefined,
        },
        database: {
            development: {
                type: DatabaseTypes.enum.mongo,
                endpoint: getMongoURI(),
                dbname: process.env.DATABASE_NAME || '',
                authSource: 'admin',
            },
        },
        server: {
            baseURL: process.env.API_BASE_URL || 'http://localhost',
            port: process.env.API_PORT ? parseInt(process.env.API_PORT) : 9229,
        },
        networks: ProsopoNetworksSchema.parse(networksConfig),
        captchaSolutions: ProsopoCaptchaSolutionConfigSchema.parse(captchaSolutionsConfig),
        batchCommit: BatchCommitConfigSchema.parse(batchCommitConfig),
        captchas: ProsopoCaptchaCountConfigSchema.parse(captchaServeConfig),
    })
