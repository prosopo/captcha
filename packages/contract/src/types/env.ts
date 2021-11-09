import {ProsopoConfig} from './config'
import {Database} from './db'
import {network, patract} from "redspot";
import Contract from "@redspot/patract/contract";

export interface ProsopoEnvironment {
    network: typeof network,
    patract: typeof patract
    contract: ProsopoContract,
    config: ProsopoConfig,
    db: Database,
}

export type ProsopoContract = Promise<Contract>;
