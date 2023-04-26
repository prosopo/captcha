// Copyright 2021-2022 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// import { Keyring } from '@polkadot/keyring';
// import yargs from 'yargs/yargs';
// import { hideBin } from 'yargs/helpers';
import { KeyringPair } from '@polkadot/keyring/types'
import { randomAsHex } from '@polkadot/util-crypto'
import { Payee, ProsopoEnvError } from '@prosopo/contract'
import { Environment } from '../src/env'
import { TestDapp, TestProvider } from '../tests/mocks/accounts'
import { sendFunds, setupDapp, setupProvider } from '../tests/mocks/setup'
import { generateMnemonic, updateEnvFileVar } from './utils'

const dotenv = require('dotenv')
const fse = require('fs-extra')
const path = require('path')

dotenv.config()

// const argv = yargs(hideBin(process.argv)).argv;
const integrationPath = '../../'

const defaultProvider: TestProvider = {
    serviceOrigin: 'http://localhost:8282' + randomAsHex().slice(0, 8), // make it "unique"
    fee: 10,
    payee: Payee.Provider,
    stake: Math.pow(10, 13),
    datasetFile: path.join(integrationPath, 'data/captchas.json'),
    mnemonic: process.env.PROVIDER_MNEMONIC || '',
    address: process.env.PROVIDER_ADDRESS || '',
    captchaDatasetId: '',
}

const defaultDapp: TestDapp = {
    serviceOrigin: 'http://localhost:9393',
    mnemonic: '//Ferdie',
    contractAccount: process.env.DAPP_CONTRACT_ADDRESS || '',
    optionalOwner: '5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL', // Ferdie's address
    fundAmount: Math.pow(10, 12),
}

const hasProviderAccount = defaultProvider.mnemonic && defaultProvider.address

async function copyArtifacts() {
    const artifactsPath = path.join(integrationPath, 'protocol/artifacts')
    await Promise.all([
        fse.copy(artifactsPath, './artifacts', { overwrite: true }),

        fse.copy(artifactsPath, '../contract/artifacts', { overwrite: true }),
        fse.copy(path.join(artifactsPath, 'prosopo.json'), '../contract/src/abi/prosopo.json', { overwrite: true }),
    ])
}

async function setupEnvFile(mnemonic: string, address: string) {
    let [contractEnvFile, defaultEnvFile] = await Promise.all([
        fse.readFile(path.join(integrationPath, '.env'), 'utf8'),
        fse.readFile('./env.txt', 'utf8'),
    ])
    contractEnvFile = updateEnvFileVar(contractEnvFile, 'DATABASE_HOST', '127.0.0.1')
    defaultEnvFile = updateEnvFileVar(defaultEnvFile, 'PROVIDER_MNEMONIC', `"${mnemonic}"`)
    defaultEnvFile = updateEnvFileVar(defaultEnvFile, 'PROVIDER_ADDRESS', address)

    await fse.writeFile('./.env', [contractEnvFile, defaultEnvFile].join('\n'))
}

async function registerProvider(env: Environment, account: TestProvider) {
    const providerKeyringPair: KeyringPair = await env.contractInterface!.network.keyring.addFromMnemonic(
        account.mnemonic
    )

    account.address = providerKeyringPair.address

    await sendFunds(env, account.address, 'Provider', 100000000000000000n)

    await setupProvider(env, account)
}

async function registerDapp(env: Environment, dapp: TestDapp) {
    await setupDapp(env, dapp)
}

async function setup() {
    const [mnemonic, address] = !hasProviderAccount
        ? await generateMnemonic()
        : [defaultProvider.mnemonic, defaultProvider.address]

    console.log(`Address: ${address}`)
    console.log(`Mnemonic: ${mnemonic}`)

    console.log('Copying contract artifacts...')
    await copyArtifacts()

    console.log('Writing .env file...')
    await setupEnvFile(mnemonic, address)

    // Load new .env file.
    dotenv.config()

    if (!process.env.DAPP_CONTRACT_ADDRESS) {
        throw new ProsopoEnvError('DEVELOPER.DAPP_CONTRACT_ADDRESS_MISSING')
    }

    const env = new Environment('//Alice')
    await env.isReady()

    defaultProvider.mnemonic = mnemonic

    console.log('Registering provider...')
    await registerProvider(env, defaultProvider)

    defaultDapp.contractAccount = process.env.DAPP_CONTRACT_ADDRESS

    console.log('Registering dapp...')
    await registerDapp(env, defaultDapp)

    process.exit()
}

setup()
