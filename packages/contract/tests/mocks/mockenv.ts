import {Database, ProsopoConfig, ProsopoEnvironment} from "../../src/types";
import {Network} from "redspot/types";
import Contract from "@redspot/patract/contract";
import {Signer} from "redspot/provider";
import {ERRORS} from "../../src/errors";
import {network, patract} from 'redspot';

export class MockEnvironment implements ProsopoEnvironment {
    config: ProsopoConfig
    network: Network
    contract?: Contract
    db: Database | undefined
    mnemonic: string
    signer?: Signer
    deployerAddress: string
    patract: any;
    contractAddress: string
    defaultEnvironment: string

    constructor() {
        this.config = {
            defaultEnvironment: "development",
            networks: {
                development: {endpoint: "", contract: {address: "", deployer: {address: ""}}}
            },
            database: {
                development: {type: "mockdb", endpoint: "", dbname: ""}
            }
        }
        this.mnemonic = "\\Alice";
        this.network = network;
        this.patract = patract;
        if (this.config.defaultEnvironment && this.config.networks.hasOwnProperty(this.config.defaultEnvironment)) {
            this.defaultEnvironment = this.config.defaultEnvironment
            this.deployerAddress = this.config.networks[this.defaultEnvironment].contract.deployer.address;
            this.contractAddress = this.config.networks[this.defaultEnvironment].contract.address;
        } else {
            throw new Error(`${ERRORS.CONFIG.UNKNOWN_ENVIRONMENT.message}:${this.config.defaultEnvironment}`);
        }
    }

    async isReady() {
        await this.importDatabase();
        await this.db?.connect();
    }

    async importDatabase() {
        try {
            let {ProsopoDatabase} = await import(`./${this.config.database[this.defaultEnvironment].type}`);
            this.db = new ProsopoDatabase(
                this.config.database[this.defaultEnvironment].endpoint,
                this.config.database[this.defaultEnvironment].dbname
            )
        } catch (err) {
            throw new Error(`${ERRORS.DATABASE.DATABASE_IMPORT_FAILED.message}:${this.config.database[this.defaultEnvironment].type}:${err}`);
        }
    }


}