import {ProsopoConfig} from './config'
import {Database} from './db'
import {network} from "redspot"
import patract from "@redspot/patract"
import Contract from "@redspot/patract/contract"
import {AccountSigner} from 'redspot/provider'
import {Signer} from 'redspot/provider'

export interface ProsopoEnvironment {
    network: typeof network,
    patract: typeof patract
    contractPromise: Promise<Contract>,
    contract?: Contract
    config: ProsopoConfig,
    db: Database,
    providerSigner?: Signer | undefined
    dappSigner?: Signer | undefined
}