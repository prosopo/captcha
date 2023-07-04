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
// import {ProsopoConfig} from './types';

import { DatabaseTypes, EnvironmentTypes, EnvironmentTypesSchema, ProsopoConfig } from '@prosopo/types'
import { getLogLevel } from './process.env'

export default (): ProsopoConfig => ({
    logLevel: getLogLevel(),
    defaultEnvironment:
        (process.env.DEFAULT_ENVIRONMENT as EnvironmentTypes) || EnvironmentTypesSchema.enum.development,
    account: {
        address: process.env.PROVIDER_ADDRESS || '',
        password: process.env.PROVIDER_ACCOUNT_PASSWORD || undefined,
    },
    networks: {
        development: {
            endpoint: process.env.SUBSTRATE_NODE_URL || 'http://localhost:9944', // TODO accept array of endpoints. Wsprovider takes array and has failover.
            contract: {
                address: process.env.PROTOCOL_CONTRACT_ADDRESS || '',
                name: 'prosopo',
            },
            accounts: ['//Alice', '//Bob', '//Charlie', '//Dave', '//Eve', '//Ferdie'],
        },
    },
    captchas: {
        solved: {
            count: 1, // TODO add env var
        },
        unsolved: {
            count: 1, // TODO add env var
        },
    },
    captchaSolutions: {
        captchaBlockRecency: 10, // TODO add env var
        requiredNumberOfSolutions: 3, // TODO add env var
        solutionWinningPercentage: 80, // TODO add env var
        captchaFilePath: '../../data/captchas.json', // TODO add env var
    },
    database: {
        development: {
            type: DatabaseTypes.enum.mongo,
            endpoint: `mongodb+srv://${process.env.DATABASE_USERNAME}:${process.env.DATABASE_PASSWORD}@${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT}/?retryWrites=true&w=majority`,
            dbname: process.env.DATABASE_NAME || '',
            authSource: 'admin',
        },
    },
    batchCommit: {
        interval: 300, // TODO add env var
        maxBatchExtrinsicPercentage: 59, // TODO add env var
    },
    server: {
        baseURL: process.env.API_BASE_URL || '',
        port: process.env.API_PORT ? parseInt(process.env.API_PORT) : 9229,
        fileServePaths: process.env.FILE_SERVE_PATHS || '[]',
    },
})
