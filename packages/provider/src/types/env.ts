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
import { ContractAbi, ProsopoContractMethods } from '@prosopo/contract'
import { AssetsResolver } from '@prosopo/datasets'
import { Database } from './db'
import { ProsopoConfig } from './config'
import { WsProvider } from '@polkadot/rpc-provider'
import { Keyring } from '@polkadot/keyring'
import { ApiPromise } from '@polkadot/api'
import { KeyringPair } from '@polkadot/keyring/types'
import { Logger } from '@prosopo/common'
export interface ProsopoEnvironment {
    config: ProsopoConfig
    db: Database | undefined
    contractInterface: ProsopoContractMethods
    contractAddress: string
    defaultEnvironment: string
    contractName: string
    abi: ContractAbi
    logger: Logger
    assetsResolver: AssetsResolver | undefined
    wsProvider: WsProvider
    keyring: Keyring
    pair: KeyringPair
    api: ApiPromise
    isReady(): Promise<void>
    importDatabase(): Promise<void>
    changeSigner(pair: KeyringPair): Promise<void>
}
