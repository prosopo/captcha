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
import { selectableNetworks } from '@polkadot/networks'
import { testParasRococoCommon } from '@polkadot/apps-config'
async function run() {
    // // Construct
    // const provider = 'ws://localhost:9944'
    // // const provider = 'wss://shiden.public.blastapi.io'
    // const wsProvider = new WsProvider(provider)
    // const api = await ApiPromise.create({ provider: wsProvider })

    selectableNetworks.forEach((network) => {
        if (network.network === 'shiden') console.log('Network:', network)
    })
    for (const testPara of testParasRococoCommon) {
        if (testPara.info === 'rococoContracts') {
            console.log('Test Para:', testPara)
        }
    }
}

run()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(-1)
    })
