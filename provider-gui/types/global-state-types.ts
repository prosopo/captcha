import { Actions, Dataset, Environment, Summary } from './provider-profile-types'
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'

export interface GlobalState {
    profile: {
        environment?: Partial<Environment>
        actions?: Partial<Actions>
        dataset?: Partial<Dataset>
        summary?: Partial<Summary>
    }
    accounts: InjectedAccountWithMeta[]
    currentAccount?: string
}
