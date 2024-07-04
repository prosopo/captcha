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
    DatabaseTypes,
    EnvironmentTypesSchema,
    NetworkNamesSchema,
    NetworkPairTypeSchema,
    ProsopoConfigSchema,
} from '@prosopo/types'
import { getLogLevel } from '@prosopo/common'

const logLevel = getLogLevel()
export default function getTestConfig() {
    return ProsopoConfigSchema.parse({
        logLevel,
        defaultEnvironment: EnvironmentTypesSchema.Values.development,
        defaultNetwork: NetworkNamesSchema.Values.development,
        account: {
            password: '',
            address: '',
        },
        database: {
            development: { type: DatabaseTypes.enum.mongoMemory, endpoint: '', dbname: 'prosopo_test', authSource: '' },
        },
        server: {
            baseURL: 'http://localhost',
            port: 9229,
            fileServePaths: '[]',
        },
        networks: {
            development: {
                endpoint: ['ws://localhost:9944'],
                contract: {
                    address: process.env.PROSOPO_CONTRACT_ADDRESS || '',
                    name: 'prosopo',
                },
                pairType: NetworkPairTypeSchema.parse('sr25519'),
                ss58Format: 42,
            },
        },
    })
}
