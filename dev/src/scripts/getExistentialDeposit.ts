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
import { ApiPromise, WsProvider } from '@polkadot/api'
import { oneUnit } from '@prosopo/contract'
async function run() {
    // Construct
    const provider = 'ws://localhost:9944'
    // const provider = 'wss://shiden.public.blastapi.io'
    const wsProvider = new WsProvider(provider)
    const api = await ApiPromise.create({ provider: wsProvider })

    // Do something
    const existentialDeposit = await api.consts.balances.existentialDeposit
    const unit = await oneUnit(api)
    const chainDecimals = api.registry.chainDecimals
    console.log('Chain decimal places:', chainDecimals)
    console.log('One Unit:', unit.toString())
    console.log('Existential Deposit:', existentialDeposit.toNumber())
    console.log('Existential Deposit in UNITs:', existentialDeposit.div(unit).toNumber(), 'UNIT')
    console.log('Existential Deposit Hex:', existentialDeposit.toHex?.())
    return existentialDeposit
}

run()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(-1)
    })
