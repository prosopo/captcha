import {ProsopoConfig} from './config'
import {Database} from './db'
import Contract from "@redspot/patract/contract"
import {Signer} from 'redspot/provider'
import {Network} from "redspot/types"

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
}