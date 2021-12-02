require('dotenv').config()
import {Database, ProsopoConfig, ProsopoEnvironment} from './types';
import findUp from 'find-up';
import {ERRORS} from './errors'
// @ts-ignore
import {network, patract} from 'redspot';
import {Network} from "redspot/types"
import {Signer} from 'redspot/provider'
import Contract from "@redspot/patract/contract"
import {strict as assert} from 'assert';

const TS_CONFIG_FILENAME = "prosopo.config.ts"
const JS_CONFIG_FILENAME = "prosopo.config.js"

export class Environment implements ProsopoEnvironment {
    config: ProsopoConfig
    network: Network
    contract?: Contract
    db: Database | undefined
    providerSigner?: Signer
    dappSigner?: Signer
    deployerAddress: string
    patract: any;
    contractAddress: string
    providerAddress: string
    defaultEnvironment: string


    constructor() {
        this.config = Environment.getConfig();
        this.network = network;
        this.patract = patract;
        if (this.config.defaultEnvironment && this.config.networks.hasOwnProperty(this.config.defaultEnvironment)) {
            this.defaultEnvironment = this.config.defaultEnvironment
            this.deployerAddress = this.config.networks[this.defaultEnvironment].contract.deployer.address;
            this.contractAddress = this.config.networks[this.defaultEnvironment].contract.address;
            this.providerAddress = this.config.networks[this.defaultEnvironment].provider.address;
        } else {
            throw new Error(`${ERRORS.CONFIG.UNKNOWN_ENVIRONMENT}:${this.config.defaultEnvironment}`);
        }
    }

    async isReady() {
        await this.getSigners();
        await this.getContract();
        await this.importDatabase();
        await this.db?.connect();
        assert(this.providerSigner instanceof Signer);
        assert(this.contract instanceof Contract);
    }

    async importDatabase() {
        try {
            let {ProsopoDatabase} = await import(`./db/${this.config.database[this.defaultEnvironment].type}`);
            this.db = new ProsopoDatabase(this.config.database[this.defaultEnvironment].endpoint,
                this.config.database[this.defaultEnvironment].dbname)
        } catch (err) {
            throw new Error(`${ERRORS.DATABASE.DATABASE_IMPORT_FAILED.message}:${this.config.database[this.defaultEnvironment].type}`);
        }
    }

    async getContract() {
        await this.network.api.isReadyOrError;
        const contractFactory = await patract.getContractFactory("prosopo", this.providerAddress);
        this.contract = await contractFactory.attach(this.contractAddress);
    }

    // utility functions
    async getSigners() {
        await this.network.api.isReadyOrError;
        // TODO this logic about having multiple people configured in the service at once is pretty confusing.
        //  Maybe only one person should be allowed to sign at one time.
        if (this.providerAddress) {
            let mnemonic = this.config.networks[this.defaultEnvironment].provider.mnemonic
            if (mnemonic) {
                const keyringPair = this.network.keyring.addFromMnemonic(mnemonic);
                // @ts-ignore
                this.providerSigner = this.network.createSigner(keyringPair);
            }
        }
    }

    private static getConfigPath() {
        const tsConfigPath = findUp.sync(TS_CONFIG_FILENAME);
        if (tsConfigPath !== null) {
            return tsConfigPath;
        }

        const pathToConfigFile = findUp.sync(JS_CONFIG_FILENAME);

        if (pathToConfigFile === null) {
            throw new Error(ERRORS.GENERAL.CANNOT_FIND_CONFIG_FILE.message);
        }

        return pathToConfigFile;
    }

    private static getConfig() {
        const filePath = Environment.getConfigPath();
        if (filePath) {
            return Environment.importCsjOrEsModule(filePath)
        }
    }

    private static importCsjOrEsModule(filePath: string): any {
        const imported = require(filePath);
        return imported.default !== undefined ? imported.default : imported;
    }


}

