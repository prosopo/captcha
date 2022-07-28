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
import { Payee, BigNumber } from '@prosopo/contract';
import { IProviderAccount, IDappAccount } from '../../src/types/accounts';

export const PROVIDER: IProviderAccount = {
    serviceOrigin: 'http://localhost:8282',
    fee: 10,
    payee: Payee.Provider,
    stake: 1000000000000000n,
    datasetFile: './data/captchas.json',
    captchaDatasetId: '',
    mnemonic: '',
    address: '',
}

export const DAPP: IDappAccount = {
    serviceOrigin: 'http://localhost:9393',
    mnemonic: '//Ferdie',
    contractAccount: process.env.DAPP_CONTRACT_ADDRESS || '', // Must be deployed
    optionalOwner: '5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL', // Ferdie's address
    fundAmount: 1000000000000000n,
}

export const DAPP_USER = {
    mnemonic: '//Charlie',
    address: '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y'
}
