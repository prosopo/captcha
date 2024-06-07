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
// ../.env | .env.local | .env.development >>
// PROSOPO_API_BASE_URL=http://localhost
// PROSOPO_SITE_KEY=5FzjruAqyhRGV81pMb4yznNS7t52hNB8u2VC2N1P22j5QLY9
import { ProsopoClientConfigInput, ProsopoClientConfigSchema } from '@prosopo/types'
import { getAddress, getEnv, getNetwork, getServerUrl } from '@prosopo/config'

const getWeb2 = (): boolean | undefined => {
    return process.env.PROSOPO_WEB2 === 'true' ? true : process.env.PROSOPO_WEB2 === 'false' ? false : undefined
}

const config: ProsopoClientConfigInput = ProsopoClientConfigSchema.parse({
    account: {
        address: getAddress(),
    },
    web2: getWeb2(),
    defaultEnvironment: getEnv(),
    defaultNetwork: getNetwork(),
    dappName: 'client-example',
    serverUrl: getServerUrl(),
})

export default config
