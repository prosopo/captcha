import { GlobalState } from '@/types/global-state-types'
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'
import { actionsMock, datasetMock, environmentMock, summaryMock } from './profile-mocks'

// Mock for injected Polkadot account
const polkadotAccountMock: InjectedAccountWithMeta = {
    address: 'polkadotAddress',
    meta: {
        name: 'AccountName',
        source: 'polkadot.js',
    },
}

const globalStateMock: GlobalState = {
    profileEnvironment: environmentMock,
    profileActions: actionsMock,
    profileDataset: datasetMock,
    profileSummary: summaryMock,
    polkadotAccounts: [polkadotAccountMock],
    currentPolkadotAccount: polkadotAccountMock.address,
}

export default globalStateMock
