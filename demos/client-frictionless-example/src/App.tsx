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

import { EnvironmentTypes, EnvironmentTypesSchema, ProsopoClientConfigSchema } from '@prosopo/types'
import { ProcaptchaFrictionless } from '@prosopo/procaptcha-frictionless'
import { useState } from 'react'

function App() {
    const [account, setAccount] = useState<string>('')
    const config = ProsopoClientConfigSchema.parse({
        userAccountAddress: account,
        account: {
            address: process.env.PROSOPO_SITE_KEY || '',
        },
        web2: process.env.PROSOPO_WEB2 === 'true',
        dappName: 'client-example',
        defaultEnvironment:
            (process.env.PROSOPO_DEFAULT_ENVIRONMENT as EnvironmentTypes) || EnvironmentTypesSchema.enum.development,
        serverUrl: process.env.PROSOPO_SERVER_URL || '',
        atlasUri: process.env._DEV_ONLY_WATCH_EVENTS === 'true' || false,
    })
    return (
        <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <ProcaptchaFrictionless config={config} />
        </div>
    )
}

export default App
