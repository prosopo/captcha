require('dotenv').config()
import {contractDefinitions} from "./contract/definitions";
import {Database, ProsopoConfig, ProsopoEnvironment} from './types';
import findUp from 'find-up';
import {ERRORS} from './errors'
// @ts-ignore
import {network, patract} from 'redspot';
import {Network} from "redspot/types"
import {Signer} from 'redspot/provider'
import Contract from "@redspot/patract/contract"
import {strict as assert} from 'assert';

const {mnemonicGenerate} = require('@polkadot/util-crypto');

const TS_CONFIG_FILENAME = "prosopo.config.ts"
const JS_CONFIG_FILENAME = "prosopo.config.js"
const CONTRACT_NAME = "prosopo"

export class Environment implements ProsopoEnvironment {
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


    constructor(mnemonic) {
        this.config = Environment.getConfig();
        this.network = network;
        this.patract = patract;
        this.mnemonic = mnemonic;
        if (this.config.defaultEnvironment && this.config.networks.hasOwnProperty(this.config.defaultEnvironment)) {
            this.defaultEnvironment = this.config.defaultEnvironment
            this.deployerAddress = this.config.networks[this.defaultEnvironment].contract.deployer.address;
            this.contractAddress = this.config.networks[this.defaultEnvironment].contract.address;
        } else {
            throw new Error(`${ERRORS.CONFIG.UNKNOWN_ENVIRONMENT}:${this.config.defaultEnvironment}`);
        }
    }

    async isReady() {
        await this.getSigner();
        await this.getContract();
        await this.importDatabase();
        await this.db?.connect();
        // redspot will do this if using `npx redspot` commands. do it here anyway in case using `yarn ts-node ...`
        await this.network.registry.register(contractDefinitions);
        assert(this.contract instanceof Contract);
    }

    async importDatabase(): Promise<void> {
        try {
            let {ProsopoDatabase} = await import(`./db/${this.config.database[this.defaultEnvironment].type}`);
            this.db = new ProsopoDatabase(
                this.config.database[this.defaultEnvironment].endpoint,
                this.config.database[this.defaultEnvironment].dbname
            )
        } catch (err) {
            throw new Error(`${ERRORS.DATABASE.DATABASE_IMPORT_FAILED.message}:${this.config.database[this.defaultEnvironment].type}:${err}`);
        }
    }

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

    async createAccountAndAddToKeyring(): Promise<string[]> {
        const mnemonic: string = mnemonicGenerate();
        const account = this.network.keyring.addFromMnemonic(mnemonic);
        const address: string = account.address;
        return [mnemonic, address]
    }

    private static getConfigPath(): string {
        const tsConfigPath = findUp.sync(TS_CONFIG_FILENAME);
        if (tsConfigPath !== undefined) {
            return tsConfigPath;
        }

        const pathToConfigFile = findUp.sync(JS_CONFIG_FILENAME);

        if (pathToConfigFile === undefined) {
            throw new Error(ERRORS.GENERAL.CANNOT_FIND_CONFIG_FILE.message);
        }

        return pathToConfigFile;
    }

    private static getConfig(): ProsopoConfig {
        const filePath = Environment.getConfigPath();
        return Environment.importCsjOrEsModule(filePath)

    }

    private static importCsjOrEsModule(filePath: string): any {
        const imported = require(filePath);
        return imported.default !== undefined ? imported.default : imported;
    }


}

