import { Actions, Dataset, Environment, Summary } from './provider-profile-types'
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'

export interface GlobalState {
    profile: { environment?: Environment; actions?: Actions; dataset?: Dataset; summary?: Summary }
    accounts: InjectedAccountWithMeta[]
    currentAccount: string
}

export const networks = ['rococo', 'development']
