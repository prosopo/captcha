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
