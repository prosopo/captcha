import { BigNumber } from '@prosopo/contract'

export interface IUserAccount {
    mnemonic: string
    address: string
}

export interface IProviderAccount extends IUserAccount {
    serviceOrigin: string
    fee: number
    datasetFile: string
    stake: BigNumber
    payee: string
    captchaDatasetId: string
}

export interface IDappAccount {
    serviceOrigin: string
    mnemonic: string
    contractAccount: string
    optionalOwner: string
    fundAmount: BigNumber
}
