import { BN } from '@polkadot/util'
import { KeyringPair } from '@polkadot/keyring/types'
import { Payee } from '../contract/typechain/captcha/types-arguments/captcha'

export interface IUserAccount {
    secret?: string
    address: string
}

export interface IProviderAccount extends IUserAccount {
    url: string
    fee: number
    datasetFile: string
    stake: number | BN
    payee: Payee
    captchaDatasetId: string
    pair?: KeyringPair
}

export interface IDappAccount {
    secret: string
    contractAccount: string
    fundAmount: number | BN
    pair?: KeyringPair
}
