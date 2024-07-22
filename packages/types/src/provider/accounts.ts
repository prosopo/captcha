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
import { BN } from '@polkadot/util/bn'
import { KeyringPair } from '@polkadot/keyring/types'

//temp
export enum Payee {
    provider = 'Provider',
    dapp = 'Dapp',
}
export interface IUserAccount {
    secret?: string
    address: string
}

export interface IProviderAccount extends IUserAccount {
    url: string
    fee: number
    datasetFile: string
    stake: BN
    payee: Payee.dapp
    captchaDatasetId: string
    pair?: KeyringPair
}

export interface IDappAccount {
    secret: string
    fundAmount: BN
    pair?: KeyringPair
}
