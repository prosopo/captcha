import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'
import { ProfileActions, ProfileDataset, ProfileEnvironment, ProfileSummary } from './provider-profile-types'

export interface GlobalState {
    profileEnvironment?: ProfileEnvironment
    profileActions?: ProfileActions
    profileDataset?: ProfileDataset
    profileSummary?: ProfileSummary
    polkadotAccounts: InjectedAccountWithMeta[]
    currentPolkadotAccount: string
}
