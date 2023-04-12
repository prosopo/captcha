import { BN } from '@polkadot/util'
import { KeyringPair } from '@polkadot/keyring/types'
// TODO move these somewhere else to avoid circular dependencies. They are currently imported by provider tests
export interface IUserAccount {
    secret?: string
    address: string
}

export interface IProviderAccount extends IUserAccount {
    serviceOrigin: string
    fee: number
    datasetFile: string
    stake: number | BN
    payee: string
    captchaDatasetId: string
    pair?: KeyringPair
}

export interface IDappAccount {
    serviceOrigin: string
    secret: string
    contractAccount: string
    fundAmount: number | BN
    pair?: KeyringPair
}
