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
import { GlobalState } from '../types/GlobalStateTypes'
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'
import { actionsMock, datasetMock, environmentMock, summaryMock } from './profile-mocks'

// Mock for injected Polkadot account
const accountMock: InjectedAccountWithMeta = {
    address: 'polkadotAddress',
    meta: {
        name: 'AccountName',
        source: 'polkadot.js',
    },
}

const globalStateMock: GlobalState = {
    profile: { environment: environmentMock, actions: actionsMock, dataset: datasetMock, summary: summaryMock },
    accounts: [accountMock],
    currentAccount: accountMock.address,
}

export default globalStateMock
