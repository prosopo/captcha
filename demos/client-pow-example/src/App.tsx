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

import { ProcaptchaPow } from '@prosopo/procaptcha-pow'
import { ProsopoClientConfigSchema } from '@prosopo/types'
import { getAddress, getDevOnlyWatchEventsFlag, getMongoAtlasURI, getServerUrl, getWeb2 } from '@prosopo/config'
import { useState } from 'react'

function App() {
    const [account, setAccount] = useState<string>('')
    const config = ProsopoClientConfigSchema.parse({
        userAccountAddress: account,
        account: {
            address: getAddress(),
        },
        web2: getWeb2(),
        dappName: 'client-example',
        serverUrl: getServerUrl(),
        mongoAtlasUri: getMongoAtlasURI(),
        devOnlyWatchEvents: getDevOnlyWatchEventsFlag(),
    })
    return (
        <div style={{ height: '100%', display: 'block', justifyContent: 'center', alignItems: 'center' }}>
            <ProcaptchaPow config={config} />
        </div>
    )
}

export default App
