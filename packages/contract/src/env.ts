require('dotenv').config()
import {Database, ProsopoConfig, ProsopoEnvironment} from './types';
import findUp from 'find-up';
import {ERRORS} from './errors'
// @ts-ignore
import {network, patract} from 'redspot';
import {Network} from "redspot/types"
import {ProsopoDatabase} from './db'
import {AccountSigner, Signer} from 'redspot/provider'
import Contract from "@redspot/patract/contract"
import {strict as assert} from 'assert';

const TS_CONFIG_FILENAME = "prosopo.config.ts"
const JS_CONFIG_FILENAME = "prosopo.config.js"
const PERSONS = ["dapp", "provider"];

export class Environment implements ProsopoEnvironment {
    config: ProsopoConfig
    network: Network
    contract?: Contract
    db: Database
    providerSigner?: Signer
    dappSigner?: Signer
    deployerAddress: string
    patract: any;
    contractAddress: string
    providerAddress: string
    defaultEnvironment: string

    constructor() {
        this.config = this.getConfig();
        this.network = network;
        this.patract = patract;
        if (this.config.defaultEnvironment && this.config.networks.hasOwnProperty(this.config.defaultEnvironment)) {
            this.defaultEnvironment = this.config.defaultEnvironment
            this.deployerAddress = this.config.networks[this.defaultEnvironment].contract.deployer.address;
            this.contractAddress = this.config.networks[this.defaultEnvironment].contract.address;
            this.db = new ProsopoDatabase(this.config.networks[this.defaultEnvironment].endpoint,
                this.config.database[this.defaultEnvironment].dbname)
            this.providerAddress = this.config.networks[this.defaultEnvironment].provider.address;
        } else {
            throw new Error(`You asked for defaultEnvironment=${this.config.defaultEnvironment} but this could not be found in the config file`);
        }
    }

    async isReady() {
        await this.getSigners();
        await this.getContract();
        assert(this.providerSigner instanceof Signer);
        assert(this.contract instanceof Contract);
    }

    async getContract() {
        await this.network.api.isReadyOrError;
        let network = this.network;
        const contractFactory = await patract.getContractFactory("prosopo", this.providerAddress);
        const contract = await contractFactory.attach(this.contractAddress);
        this.contract = contract;
    }

    // utility functions
    async getSigners() {
        await this.network.api.isReadyOrError;
        const signerClass = new AccountSigner();
        // TODO this logic about having multiple people configured in the service at once is pretty confusing.
        //  Maybe only one person should be allowed to sign at one time.
        if (this.providerAddress) {
            let mnemonic = this.config.networks[this.defaultEnvironment].provider.mnemonic
            if (mnemonic) {
                const keyringPair = this.network.keyring.addFromMnemonic(mnemonic);
                const signer = this.network.createSigner(keyringPair);
                // @ts-ignore
                this.providerSigner = signer;
            }
        }
    }

    private getConfigPath() {
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

    private getConfig() {
        const filePath = this.getConfigPath();
        let config = this.importCsjOrEsModule(filePath);
        return config
    }

    private importCsjOrEsModule(filePath: string): any {
        const imported = require(filePath);
        return imported.default !== undefined ? imported.default : imported;
    }


}

