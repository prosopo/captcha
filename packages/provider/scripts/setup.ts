import fse from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';
import dotenv from 'dotenv';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

import { KeyringPair } from '@polkadot/keyring/types';
import { randomAsHex } from '@polkadot/util-crypto';

import { Environment } from '../src/env';
import { TestAccount, TestDapp, TestProvider } from '../tests/mocks/accounts';
import { approveOrDisapproveCommitment, sendFunds, setupDapp, setupDappUser, setupProvider } from '../tests/mocks/setup';
import { Payee } from "@prosopo/contract";

import { cryptoWaitReady, mnemonicGenerate } from '@polkadot/util-crypto';
import { Keyring } from '@polkadot/keyring';
const keyring = new Keyring({ type: 'sr25519' });

// TODO: Add path to protocol contract as argument. (after rm npm-ws from integration)
// const argv = yargs(hideBin(process.argv)).argv;
const integrationPath = '../../';

let provider: [mnemonic: string, address: string];

dotenv.config();

const PROVIDER: TestProvider = {
    serviceOrigin: 'http://localhost:8282' + randomAsHex().slice(0, 8), // make it "unique"
    fee: 10,
    payee: Payee.Provider,
    stake: Math.pow(10, 13),
    datasetFile: '../../data/captchas.json',
    mnemonic: '',
    address: '',
    captchaDatasetId: ''
};

const DAPP: TestDapp = {
    serviceOrigin: 'http://localhost:9393',
    mnemonic: '//Ferdie',
    contractAccount: '',
    optionalOwner: '5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL', // Ferdie's address
    fundAmount: Math.pow(10, 12)
};

const DAPP_USER: TestAccount = {
    mnemonic: '//Charlie',
    address: '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y'
};

async function generateMnemonic(): Promise<[string, string]> {
    await cryptoWaitReady();
    const mnemonic = mnemonicGenerate();
    const account = keyring.addFromMnemonic(mnemonic);
  
    console.log(`Address: ${account.address}`);
    console.log(`Mnemonic: ${mnemonic}`);
    
    return [mnemonic, account.address];
}

async function copyArtifacts() {
    const artifactsPath = path.join(integrationPath, 'protocol/artifacts');
    await fse.copy(artifactsPath, '../contract/artifacts', { overwrite: true });
    await fse.copy(artifactsPath, './artifacts', { overwrite: true }); // TODO: remove from artifacts provider. Included in @prosopo/contract.
    await fse.copy(path.join(artifactsPath, 'prosopo.json'), '../contract/src/abi/prosopo.json', { overwrite: true });
}

async function setupEnvFile() {
    let contractEnvFile = await fse.readFile(path.join(integrationPath, '.env'), 'utf8');
    let defaultEnvFile = await fse.readFile('./env.txt', 'utf8');

    contractEnvFile = contractEnvFile.replace('DATABASE_HOST=provider-db', 'DATABASE_HOST=localhost');

    if (!process.env.PROVIDER_MNEMONIC || !process.env.PROVIDER_ADDRESS) {
        provider = await generateMnemonic();
    } else {
        provider = [process.env.PROVIDER_MNEMONIC, process.env.PROVIDER_ADDRESS];
    }

    defaultEnvFile = defaultEnvFile.replace('PROVIDER_MNEMONIC=%PROVIDER_MNEMONIC%', `PROVIDER_MNEMONIC="${provider[0]}"`);
    defaultEnvFile = defaultEnvFile.replace('PROVIDER_ADDRESS=%PROVIDER_ADDRESS%', `PROVIDER_ADDRESS=${provider[1]}`);

    await fse.writeFile('./.env', [contractEnvFile, defaultEnvFile].join('\n'));
}

async function setup() {

    await copyArtifacts();
    await setupEnvFile();

    if (!process.env.DAPP_CONTRACT_ADDRESS) {
        throw new Error('DAPP_CONTRACT_ADDRESS');
    }

    if (!process.env.PROVIDER_MNEMONIC || !process.env.PROVIDER_ADDRESS) {

        dotenv.config();

        const env = new Environment('//Alice');
        await env.isReady();

        PROVIDER.mnemonic = provider[0];
        PROVIDER.address = provider[1];

        const providerKeyringPair: KeyringPair = await env.contractInterface!.network.keyring.addFromMnemonic(PROVIDER.mnemonic);
        PROVIDER.address = providerKeyringPair.address;

        await sendFunds(env, providerKeyringPair.address, 'Provider', 100000000000000000n);

        await setupProvider(env, PROVIDER);

        DAPP.contractAccount = process.env.DAPP_CONTRACT_ADDRESS;

        await setupDapp(env, DAPP);

    }

}

setup();