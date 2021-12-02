import {ProsopoConfig} from './config'
import {Database} from './db'
import Contract from "@redspot/patract/contract"
import {Signer} from 'redspot/provider'
import {Network} from "redspot/types"

export interface ProsopoEnvironment {
    network: Network,
    contract?: Contract
    config: ProsopoConfig,
    db: Database | undefined,
    providerSigner?: Signer | undefined
    dappSigner?: Signer | undefined
    deployerAddress: string
    contractAddress: string
    providerAddress: string
    defaultEnvironment: string
}