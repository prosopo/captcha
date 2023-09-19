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
// ../.env | .env.local | .env.development >>
// REACT_APP_API_BASE_URL=http://localhost:9229
// REACT_APP_API_PATH_PREFIX=/v1/prosopo
// REACT_APP_DAPP_SITE_KEY=5FzjruAqyhRGV81pMb4yznNS7t52hNB8u2VC2N1P22j5QLY9
// https://create-react-app.dev/docs/adding-custom-environment-variables/

import { EnvironmentTypesSchema } from '@prosopo/types'
import { LogLevel } from '@prosopo/common'
import { ProsopoClientConfig } from '@prosopo/types'
import { z } from 'zod'

const { REACT_APP_PROSOPO_CONTRACT_ADDRESS, REACT_APP_SUBSTRATE_ENDPOINT } = z
    .object({
        REACT_APP_PROSOPO_CONTRACT_ADDRESS: z.string(),
        REACT_APP_SUBSTRATE_ENDPOINT: z.string(),
    })
    .parse(process.env)

const config: ProsopoClientConfig = {
    account: {
        address: process.env.REACT_APP_DAPP_SITE_KEY || '',
    },
    userAccountAddress: '',
    solutionThreshold: 80,
    web2: process.env.REACT_APP_WEB2 === 'true',
    defaultEnvironment: EnvironmentTypesSchema.enum.development,
    logLevel: LogLevel.enum.info,
    networks: {
        development: {
            endpoint: REACT_APP_SUBSTRATE_ENDPOINT,
            contract: {
                address: REACT_APP_PROSOPO_CONTRACT_ADDRESS,
                name: 'prosopo',
            },
            accounts: [],
        },
    },
    dappName: 'client-example',
    serverUrl: process.env.REACT_APP_SERVER_URL || '',
}

export default config
