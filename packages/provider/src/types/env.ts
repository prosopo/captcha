import Contract from '@redspot/patract/contract'
import { Network, Signer } from 'redspot/types'
import { ProsopoConfig } from './config'
import { Database } from './db'
import { KeyringPair } from '@polkadot/keyring/types'

export interface ProsopoEnvironment {
    network: Network
    contract?: Contract
    config: ProsopoConfig,
    db: Database | undefined,
    mnemonic: string
    signer?: Signer | undefined
    deployerAddress: string
    contractAddress: string
    defaultEnvironment: string

    isReady (): Promise<void>
    importDatabase (): Promise<void>
    getContract (): Promise<void>
    getSigner (): Promise<void>
    changeSigner (mnemonic: string): Promise<void>
    createAccountAndAddToKeyring (): [string, string]

}
