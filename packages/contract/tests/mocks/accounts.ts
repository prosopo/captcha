import { Payee } from '../../src/types'

export interface TestAccount {
    mnemonic: string
    address: string
}

export interface TestProvider extends TestAccount {
    serviceOrigin: string,
    fee: number,
    datasetFile: string,
    stake: number,
    payee: Payee
    captchaDatasetId: string,
}

export const PROVIDER: TestProvider = {
    serviceOrigin: 'http://localhost:8282',
    fee: 10,
    payee: Payee.Provider,
    stake: 10,
    datasetFile: '/usr/src/data/captchas.json',
    captchaDatasetId: '',
    mnemonic: '',
    address: ''
}

export interface TestDapp {
    serviceOrigin: string,
    mnemonic: string,
    contractAccount: string,
    optionalOwner: string
    fundAmount: number
}

export const DAPP: TestDapp = {
    serviceOrigin: 'http://localhost:9393',
    mnemonic: '//Ferdie',
    contractAccount: process.env.DAPP_CONTRACT_ADDRESS || '', // Must be deployed
    optionalOwner: '5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL', // Ferdie's address
    fundAmount: 100
}

export const DAPP_USER = {
    mnemonic: '//Charlie',
    address: '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y'
}
