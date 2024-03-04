import { Actions, Dataset, Environment, ProviderSummary } from './ProviderProfileTypes'
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'

export interface GlobalState {
    profile: { environment?: Environment; actions?: Actions; dataset?: Dataset; summary?: ProviderSummary }
    accounts: InjectedAccountWithMeta[]
    currentAccount: string
}

export const networks = ['rococo', 'development']
