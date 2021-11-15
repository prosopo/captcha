require('dotenv').config()
import {Database, ProsopoConfig, ProsopoEnvironment} from './types';
import findUp from 'find-up';
import {ERRORS} from './errors'
import {network, patract} from "redspot";
import {getContract} from './contract'
import {ProsopoDatabase} from './db'
import {AccountSigner, Signer} from 'redspot/provider'
import Contract from "@redspot/patract/contract"


const fs = require('fs');
const TS_CONFIG_FILENAME = "prosopo.config.ts"
const JS_CONFIG_FILENAME = "prosopo.config.js"
const PERSONS = ["dapp", "provider"];

export class Environment implements ProsopoEnvironment {
    config: ProsopoConfig
    network: typeof network
    patract: typeof patract
    contractPromise: Promise<Contract>
    contract?: Contract
    db: Database
    providerSigner?: Signer
    dappSigner?: Signer

    constructor() {
        this.config = this.getConfig();
        this.network = network;
        this.patract = patract;
        const defaultEnv = this.config.defaultEnvironment
        const deployerAddress = this.config.networks[defaultEnv].contract.deployer;
        this.contractPromise = getContract(network, patract, deployerAddress);
        this.db = new ProsopoDatabase(this.config.networks[defaultEnv].endpoint,
            this.config.database[defaultEnv].dbname)

    }

    async isReady() {
        if (!this.contract)
            this.contract = await this.contractPromise;
        await this.getSigners();
        console.log("Environment ready")
    }

    // utility functions
    async getSigners() {
        const signerClass = new AccountSigner();
        // TODO this logic about having multiple people configured in the service at once is pretty confusing.
        //  Maybe only one person should be allowed to sign at one time.
        if (this.config.provider) {
            if (this.config.provider.mnemonic) {
                console.log("Provider mnemonic: ", this.config.provider.mnemonic);
                const keyringPair = this.network.keyring.addFromMnemonic(this.config.provider.mnemonic);
                const signer = this.network.createSigner(keyringPair);
                console.log("Provider address: ", signer.address);
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

    private loadSeedFile(filePath) {
        return JSON.parse(fs.readFileSync(filePath));
    }

}