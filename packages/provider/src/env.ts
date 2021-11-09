import {Database, ProsopoConfig, ProsopoContract, ProsopoEnvironment} from './types';
import findUp from 'find-up';
import {ERRORS} from './errors'
import {network, patract} from "redspot"
import {getContract} from './contract'
import {ProsopoDatabase} from './db'

const fs = require('fs');

const TS_CONFIG_FILENAME = "prosopo.config.ts"
const JS_CONFIG_FILENAME = "prosopo.config.js"


export class Environment implements ProsopoEnvironment {
    config: ProsopoConfig
    network: typeof network
    patract: typeof patract
    contract: ProsopoContract
    db: Database

    constructor() {
        this.config = this.getConfig();
        this.network = network;
        this.patract = patract;
        const defaultEnv = this.config.defaultEnvironment
        const deployerAddress = this.config.networks[defaultEnv].contract.deployer;
        this.contract = getContract(network, patract, deployerAddress);
        this.db = new ProsopoDatabase(this.config.networks[defaultEnv].endpoint,
            this.config.database[defaultEnv].dbname)
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

        if (config.hasOwnProperty("provider")) {
            let seeds = JSON.parse(fs.readFileSync(config.provider.secret_file));
            config.provider.seed = seeds.seed_provider;
        }

        if (config.hasOwnProperty("dapp")) {
            let seeds = this.loadSeedFile(config.dapp.secret_file);
            config.dapp.seed = seeds.seed_dapp;
        }
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