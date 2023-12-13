import { Actions, Dataset, Environment, Summary } from './ProviderProfileTypes'
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'

export interface GlobalState {
    profile: { environment?: Environment; actions?: Actions; dataset?: Dataset; summary?: Summary }
    accounts: InjectedAccountWithMeta[]
    currentAccount: string
}

export const networks = ['rococo', 'development']
