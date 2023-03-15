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

import { DatabaseTypes, EnvironmentTypes, ProsopoConfig } from './types/index'

export default (): ProsopoConfig => ({
    logLevel: 'debug',
    defaultEnvironment: EnvironmentTypes.development,
    contract: {
        abi: '../contract/src/abi/prosopo.json',
    },
    account: {
        password: process.env.PROVIDER_ACCOUNT_PASSWORD || undefined,
    },
    networks: {
        development: {
            endpoint: process.env.SUBSTRATE_NODE_URL || 'http://localhost:9944',
            contract: {
                address: process.env.CONTRACT_ADDRESS || '',
                name: 'prosopo',
            },
            accounts: ['//Alice', '//Bob', '//Charlie', '//Dave', '//Eve', '//Ferdie'],
        },
    },
    captchas: {
        solved: {
            count: 1,
        },
        unsolved: {
            count: 1,
        },
    },
    captchaSolutions: {
        captchaBlockRecency: 10,
        requiredNumberOfSolutions: 3,
        solutionWinningPercentage: 80,
        captchaFilePath: '../../data/captchas.json',
    },
    database: {
        development: {
            type: DatabaseTypes.mongo,
            endpoint: `mongodb://${process.env.DATABASE_USERNAME}:${process.env.DATABASE_PASSWORD}@${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT}`,
            dbname: process.env.DATABASE_NAME || '',
            authSource: 'admin',
        },
    },
    batchCommit: {
        interval: 300,
        maxBatchExtrinsicPercentage: 50,
    },
    assets: {
        absolutePath: '',
        basePath: '',
    },
    server: {
        baseURL: process.env.API_BASE_URL || '',
    },
})
