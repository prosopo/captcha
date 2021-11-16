import {ProsopoConfig} from './config'
import {Database} from './db'
import {network} from "redspot"
import Contract from "@redspot/patract/contract"
import {AccountSigner} from 'redspot/provider'
import {Signer} from 'redspot/provider'
import {Network} from "redspot/types"

export interface ProsopoEnvironment {
    network: Network,
    contract?: Contract
    config: ProsopoConfig,
    db: Database,
    providerSigner?: Signer | undefined
    dappSigner?: Signer | undefined
    deployerAddress: string
}