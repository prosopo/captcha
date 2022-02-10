// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of provider <https://github.com/prosopo-io/provider>.
//
// provider is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// provider is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with provider.  If not, see <http://www.gnu.org/licenses/>.
import { Payee } from '../../src/types'

export interface TestAccount {
    mnemonic: string
    address: string
}

export interface TestProvider extends TestAccount {
    serviceOrigin: string,
    fee: number,
    datasetFile: string,
    stake: number,
    payee: Payee
    captchaDatasetId: string,
}

export const PROVIDER: TestProvider = {
    serviceOrigin: 'http://localhost:8282',
    fee: 10,
    payee: Payee.Provider,
    stake: 1000000000000000,
    datasetFile: '/usr/src/data/captchas.json',
    captchaDatasetId: '',
    mnemonic: '',
    address: ''
}

export interface TestDapp {
    serviceOrigin: string,
    mnemonic: string,
    contractAccount: string,
    optionalOwner: string
    fundAmount: number
}

export const DAPP: TestDapp = {
    serviceOrigin: 'http://localhost:9393',
    mnemonic: '//Ferdie',
    contractAccount: process.env.DAPP_CONTRACT_ADDRESS || '', // Must be deployed
    optionalOwner: '5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL', // Ferdie's address
    fundAmount: 100
}

export const DAPP_USER = {
    mnemonic: '//Charlie',
    address: '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y'
}
