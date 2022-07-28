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
import fse from 'fs-extra';
import path from 'path';
import { Environment, getEnvFile, loadEnv } from '../env';
import { generateMnemonic, sendFunds, setupDapp, setupProvider } from '../tasks/setup';
import { IDappAccount, IProviderAccount } from '../types/accounts';

loadEnv();

const defaultProvider: IProviderAccount = {
    serviceOrigin: 'http://localhost:8282' + randomAsHex().slice(0, 8), // make it "unique"
    fee: 10,
    payee: Payee.Provider,
    stake: Math.pow(10, 13),
    datasetFile: './data/captchas.json',
    mnemonic: process.env.PROVIDER_MNEMONIC || '',
    address: process.env.PROVIDER_ADDRESS || '',
    captchaDatasetId: ''
};

const defaultDapp: IDappAccount = {
    serviceOrigin: 'http://localhost:9393',
    mnemonic: '//Ferdie',
    contractAccount: process.env.DAPP_CONTRACT_ADDRESS || '',
    optionalOwner: '5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL', // Ferdie's address
    fundAmount: Math.pow(10, 12)
};

const hasProviderAccount = defaultProvider.mnemonic && defaultProvider.address;

async function copyArtifacts() {
    // const argv = yargs(hideBin(process.argv)).argv;
    const integrationPath = '../../';
    const artifactsPath = path.join(integrationPath, 'protocol/artifacts');

    await fse.copy(path.join(artifactsPath, 'prosopo.json'), '../contract/src/abi/prosopo.json', { overwrite: true });
}

async function copyEnvFile() {
    const tplEnvFile = getEnvFile('env');
    const envFile = getEnvFile('.env');
    await fse.copy(tplEnvFile, envFile, { overwrite: false });
}

function updateEnvFileVar(source: string, name: string, value: string) {
    const envVar = new RegExp(`.*(${name}=)(.*)`, 'g');
    if (envVar.test(source)) {
        return source.replace(envVar, `$1${value}`);
    }
    return source + `\n${name}=${value}`;
}

async function updateEnvFile(vars: Record<string, string>) {
    const envFile = getEnvFile('.env');

    let readEnvFile = await fse.readFile(envFile, 'utf8');

    for (const key in vars) {
        readEnvFile = updateEnvFileVar(readEnvFile, key, vars[key]);
    }

    await fse.writeFile(envFile, readEnvFile);
}

async function registerProvider(env: Environment, account: IProviderAccount) {
    const providerKeyringPair: KeyringPair = env.contractInterface!.network.keyring.addFromMnemonic(account.mnemonic);

    account.address = providerKeyringPair.address;

    await sendFunds(env, account.address, 'Provider', 100000000000000000n); // TODO -> setupProvider().

    await setupProvider(env, account);
}

async function registerDapp(env: Environment, dapp: IDappAccount) {
    await setupDapp(env, dapp);
}

async function setup() {

    console.log('ENVIRONMENT', process.env.NODE_ENV);

    const [mnemonic, address] = (!hasProviderAccount) ? await generateMnemonic() : [defaultProvider.mnemonic, defaultProvider.address];

    console.log(`Address: ${address}`);
    console.log(`Mnemonic: ${mnemonic}`);

    if (process.env.NODE_ENV === 'development') {
        console.log('Copying contract artifacts...');
        await copyArtifacts();
    }

    console.log('Writing .env file...');
    await copyEnvFile();

    // Load setup .env file.
    loadEnv();

    if (!process.env.DAPP_CONTRACT_ADDRESS) {
        throw new Error('DAPP_CONTRACT_ADDRESS is not set in .env file.');
    }

    if (hasProviderAccount) {
        console.log('Skipping setup...');
        process.exit();
    }

    const env = new Environment('//Alice');
    await env.isReady();

    defaultProvider.mnemonic = mnemonic;

    console.log('Registering provider...');
    await registerProvider(env, defaultProvider);

    defaultDapp.contractAccount = process.env.DAPP_CONTRACT_ADDRESS;

    console.log('Registering dapp...');
    await registerDapp(env, defaultDapp);

    await updateEnvFile({'PROVIDER_MNEMONIC': `"${mnemonic}"`, 'PROVIDER_ADDRESS': address});

    process.exit();
}

setup();
