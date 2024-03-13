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
import { Alias } from 'vite'
import { getLogger } from '@prosopo/common'
import path from 'path'

// List of interfaces to replace with mock. The interface is required if commented out.
const POLKADOT_INTERFACES = [
    './assetConversion/definitions.js',
    './assets/definitions.js',
    './attestations/definitions.js',
    './aura/definitions.js',
    './author/definitions.js',
    './authorship/definitions.js',
    './babe/definitions.js',
    // './balances/definitions.js',
    './beefy/definitions.js',
    './benchmark/definitions.js',
    './blockbuilder/definitions.js',
    './bridges/definitions.js',
    // './chain/definitions.js',
    './childstate/definitions.js',
    './claims/definitions.js',
    './collective/definitions.js',
    './consensus/definitions.js',
    // './contracts/definitions.js',
    // './contractsAbi/definitions.js',
    './crowdloan/definitions.js',
    './cumulus/definitions.js',
    './democracy/definitions.js',
    './dev/definitions.js',
    './discovery/definitions.js',
    './elections/definitions.js',
    './engine/definitions.js',
    './eth/definitions.js',
    './evm/definitions.js',
    // './extrinsics/definitions.js',
    './finality/definitions.js',
    './fungibles/definitions.js',
    './genericAsset/definitions.js',
    './gilt/definitions.js',
    './grandpa/definitions.js',
    './identity/definitions.js',
    './imOnline/definitions.js',
    './lottery/definitions.js',
    //'./metadata/definitions.js',
    './mmr/definitions.js',
    './nfts/definitions.js',
    './nimbus/definitions.js',
    './nompools/definitions.js',
    './offchain/definitions.js',
    './offences/definitions.js',
    './ormlOracle/definitions.js',
    './ormlTokens/definitions.js',
    './parachains/definitions.js',
    './payment/definitions.js',
    './poll/definitions.js',
    './pow/definitions.js',
    './proxy/definitions.js',
    './purchase/definitions.js',
    './recovery/definitions.js',
    // './rpc/definitions.js',
    // './runtime/definitions.js',
    //'./scaleInfo/definitions.js',
    './scheduler/definitions.js',
    './session/definitions.js',
    './society/definitions.js',
    './staking/definitions.js',
    //'./state/definitions.js',
    './support/definitions.js',
    './syncstate/definitions.js',
    // './system/definitions.js',
    './treasury/definitions.js',
    './txpayment/definitions.js',
    './txqueue/definitions.js',
    './uniques/definitions.js',
    //'./utility/definitions.js',
    './vesting/definitions.js',
    './xcm/definitions.js',
]

const POLKADOT_UPGRADES = [
    './centrifuge-chain.js',
    './kusama.js',
    './node.js',
    './node-template.js',
    './polkadot.js',
    './shell.js',
    './statemint.js',
    './westend.js',
]

const API_DERIVE = [
    //'./accounts/index.js',
    './alliance/index.js',
    './bagsList/index.js',
    //'./balances/index.js',
    './bounties/index.js',
    //'./chain/index.js',
    //'./contracts/index.js',
    './council/index.js',
    './crowdloan/index.js',
    './democracy/index.js',
    './elections/index.js',
    './imOnline/index.js',
    './membership/index.js',
    './parachains/index.js',
    './session/index.js',
    './society/index.js',
    './staking/index.js',
    './technicalCommittee/index.js',
    './treasury/index.js',
    //'./tx/index.js',
]

const KNOWN_SUBSTRATE_CHAINS = ['./genesis.js']

const WASM_BYTES = ['./bytes.js', './cjs/bytes.js']

const log = getLogger(`Info`, `config.polkadot.exclude.js`)

export function getAliases(dir: string): Alias[] {
    const alias: Alias[] = []

    const mockUpgrade = path.resolve(dir, '../../dev/config/dist/polkadot/mockUpgrade.js')
    const mockInterface = path.resolve(dir, '../../dev/config/dist/polkadot/mockInterface.js')
    const mockSubstrate = path.resolve(dir, '../../dev/config/dist/polkadot/mockSubstrateGenesis.js')
    const mockAPIDerive = path.resolve(dir, '../../dev/config/dist/polkadot/mockApiDerive.js')
    const slimmedWASM = path.resolve(dir, '../../dev/config/dist/polkadot/bytes.js')

    POLKADOT_UPGRADES.forEach((file) => {
        log.debug(`resolving ${file} to ${mockUpgrade.split('/').slice(-1)}`)
        alias.push({ find: file, replacement: mockUpgrade })
    })
    POLKADOT_INTERFACES.forEach((file) => {
        log.debug(`resolving ${file} to ${mockUpgrade.split('/').slice(-1)}`)
        alias.push({ find: file, replacement: mockInterface })
    })
    KNOWN_SUBSTRATE_CHAINS.forEach((file) => {
        log.debug(`resolving ${file} to ${mockUpgrade.split('/').slice(-1)}`)
        alias.push({ find: file, replacement: mockSubstrate })
    })
    WASM_BYTES.forEach((file) => {
        log.debug(`resolving ${file} to ${mockUpgrade.split('/').slice(-1)}`)
        alias.push({ find: file, replacement: slimmedWASM })
    })

    API_DERIVE.forEach((file) => {
        log.debug(`resolving ${file} to ${mockUpgrade.split('/').slice(-1)}`)
        alias.push({ find: file, replacement: mockAPIDerive })
    })

    return alias
}
