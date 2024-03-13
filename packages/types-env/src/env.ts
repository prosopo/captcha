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
import type { ApiPromise } from '@polkadot/api/promise/Api'
import type { Keyring } from '@polkadot/keyring'
import type { KeyringPair } from '@polkadot/keyring/types'
import type { WsProvider } from '@polkadot/rpc-provider/ws'
import type { Logger } from '@prosopo/common'
import type { ProsopoCaptchaContract } from '@prosopo/contract'
import type {
    AssetsResolver,
    EnvironmentTypes,
    NetworkNames,
} from '@prosopo/types'
import type { ContractAbi } from '@prosopo/types'
import type { ProsopoBasicConfigOutput } from '@prosopo/types'
import type { Database } from '@prosopo/types-database' // config

export interface ProsopoEnvironment {
    config: ProsopoBasicConfigOutput
    db: Database | undefined
    contractInterface: ProsopoCaptchaContract | undefined
    contractAddress: string
    defaultEnvironment: EnvironmentTypes
    defaultNetwork: NetworkNames
    contractName: string
    abi: ContractAbi
    logger: Logger
    assetsResolver: AssetsResolver | undefined
    wsProvider: WsProvider
    keyring: Keyring
    pair: KeyringPair | undefined
    api: ApiPromise | undefined
    isReady(): Promise<void>
    importDatabase(): Promise<void>
    changeSigner(pair: KeyringPair): Promise<void>
    getApi(): ApiPromise
    getContractInterface(): ProsopoCaptchaContract
}
