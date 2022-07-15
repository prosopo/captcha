// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of provider <https://github.com/prosopo-io/provider>.
//
// provider is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// provider is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with provider.  If not, see <http://www.gnu.org/licenses/>.
// import { Keyring } from '@polkadot/keyring';
// import yargs from 'yargs/yargs';
// import { hideBin } from 'yargs/helpers';
import { KeyringPair } from '@polkadot/keyring/types';
import { randomAsHex } from '@polkadot/util-crypto';
import { Payee } from "@prosopo/contract";
import { Environment, getEnvFile, loadEnv } from '../src/env';
import { TestDapp, TestProvider } from '../tests/mocks/accounts';
import { sendFunds, setupDapp, setupProvider } from '../tests/mocks/setup';
import { generateMnemonic, updateEnvFileVar } from './utils';

const dotenv = require('dotenv');
const fse = require('fs-extra');
const path = require('path');

loadEnv();

// TODO: Add path to protocol contract as argument. (after rm npm-ws from integration)
// const argv = yargs(hideBin(process.argv)).argv;
const integrationPath = '../../';

const defaultProvider: TestProvider = {
    serviceOrigin: 'http://localhost:8282' + randomAsHex().slice(0, 8), // make it "unique"
    fee: 10,
    payee: Payee.Provider,
    stake: Math.pow(10, 13),
    datasetFile: './data/captchas.json',
    mnemonic: process.env.PROVIDER_MNEMONIC || '',
    address: process.env.PROVIDER_ADDRESS || '',
    captchaDatasetId: ''
};

const defaultDapp: TestDapp = {
    serviceOrigin: 'http://localhost:9393',
    mnemonic: '//Ferdie',
    contractAccount: process.env.DAPP_CONTRACT_ADDRESS || '',
    optionalOwner: '5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL', // Ferdie's address
    fundAmount: Math.pow(10, 12)
};

const hasProviderAccount = defaultProvider.mnemonic && defaultProvider.address;

async function copyArtifacts() {
    const artifactsPath = path.join(integrationPath, 'protocol/artifacts');
    await Promise.all([
        // TODO rm duplicate (keep in contract)?
        fse.copy(artifactsPath, './artifacts', { overwrite: true }),
        // TODO move to contract build. Make integrationPath ENV VAR?
        fse.copy(artifactsPath, '../contract/artifacts', { overwrite: true }),
        fse.copy(path.join(artifactsPath, 'prosopo.json'), '../contract/src/abi/prosopo.json', { overwrite: true }),
    ]);
}

async function setupEnvFile(mnemonic: string, address: string) {
    // let [contractEnvFile, defaultEnvFile] = await Promise.all([
    //     fse.readFile(getEnvFile('.env', integrationPath), 'utf8'),
    //     fse.readFile('./env.txt', 'utf8'),
    // ]);
    let defaultEnvFile = await fse.readFile('./env.txt', 'utf8');
    // contractEnvFile = updateEnvFileVar(contractEnvFile, 'DATABASE_HOST', '127.0.0.1');
    defaultEnvFile = updateEnvFileVar(defaultEnvFile, 'PROVIDER_MNEMONIC', `"${mnemonic}"`);
    defaultEnvFile = updateEnvFileVar(defaultEnvFile, 'PROVIDER_ADDRESS', address);

    await fse.writeFile('./.env', defaultEnvFile);
}

async function registerProvider(env: Environment, account: TestProvider) {
    const providerKeyringPair: KeyringPair = await env.contractInterface!.network.keyring.addFromMnemonic(account.mnemonic);

    account.address = providerKeyringPair.address;

    await sendFunds(env, account.address, 'Provider', 100000000000000000n); // TODO -> setupProvider().

    await setupProvider(env, account);
}

async function registerDapp(env: Environment, dapp: TestDapp) {
    await setupDapp(env, dapp);
}

async function setup() {

    const [mnemonic, address] = (!hasProviderAccount) ? await generateMnemonic() : [defaultProvider.mnemonic, defaultProvider.address];

    console.log(`Address: ${address}`);
    console.log(`Mnemonic: ${mnemonic}`);

    console.log('Copying contract artifacts...');
    await copyArtifacts();

    console.log('Writing .env file...');
    await setupEnvFile(mnemonic, address);

    // Load new .env file.
    loadEnv();

    if (!process.env.DAPP_CONTRACT_ADDRESS) {
        throw new Error('DAPP_CONTRACT_ADDRESS is not set in .env file.');
    }

    const env = new Environment('//Alice');
    await env.isReady();

    defaultProvider.mnemonic = mnemonic;

    console.log('Registering provider...');
    await registerProvider(env, defaultProvider);

    defaultDapp.contractAccount = process.env.DAPP_CONTRACT_ADDRESS;

    console.log('Registering dapp...');
    await registerDapp(env, defaultDapp);


    process.exit();
}

setup();
