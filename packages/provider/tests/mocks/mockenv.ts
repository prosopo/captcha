import {Database, ProsopoConfig, ProsopoEnvironment} from "../../src/types";
import {Network} from "redspot/types";
import Contract from "@redspot/patract/contract";
import {Signer} from "redspot/types";
import {ERRORS} from "../../src/errors";
import {network, patract} from 'redspot';
import {contractDefinitions} from "../../src/contract/definitions";
import {strict as assert} from "assert";

const {mnemonicGenerate} = require('@polkadot/util-crypto');

const CONTRACT_NAME = "prosopo"

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
                development: {
                    endpoint: "ws://substrate-node:9944",
                    contract: {
                        address: process.env.CONTRACT_ADDRESS!,
                        deployer: {
                            address: "//Alice"
                        }
                    }
                }
            },
            database: {
                development: {type: "mockdb", endpoint: "", dbname: ""}
            }
        }
        this.mnemonic = "//Alice";
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

    async isReady(): Promise<void> {
        await this.getSigner();
        await this.getContract();
        await this.importDatabase();
        await this.db?.connect();
        await this.network.registry.register(contractDefinitions);
        assert(this.contract instanceof Contract);
    }

    async importDatabase(): Promise<void> {
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

    /*
        Direct copy of functions from env.ts as contract is not currently mocked
    */
    async getContract(): Promise<void> {
        await this.network.api.isReadyOrError;
        const contractFactory = await patract.getContractFactory(CONTRACT_NAME, this.signer);
        this.contract = await contractFactory.attach(this.contractAddress);
    }

    async getSigner(): Promise<void> {
        await this.network.api.isReadyOrError;
        let mnemonic = this.mnemonic;
        if (mnemonic) {
            const keyringPair = this.network.keyring.addFromMnemonic(mnemonic);
            // @ts-ignore
            this.signer = this.network.createSigner(keyringPair);
        }
    }

    async changeSigner(mnemonic: string): Promise<void> {
        await this.network.api.isReadyOrError;
        this.mnemonic = mnemonic;
        await this.getSigner();
    }

    async createAccountAndAddToKeyring(): Promise<[string, Signer]> {
        const mnemonic: string = mnemonicGenerate();
        const keyringPair = this.network.keyring.addFromMnemonic(mnemonic);
        const signer = network.createSigner(keyringPair);
        return [mnemonic, signer]
    }

}