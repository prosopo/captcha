// Copyright 2021-2023 Prosopo (UK) Ltd.
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
import fse from 'fs-extra'
import { ProsopoEnvError, getEnvFile, getPair, getPairType, getSecret, getSs58Format } from '@prosopo/common'
import { Environment } from '@prosopo/provider'
import { setupDapp } from './dapp'
import { IDappAccount, IProviderAccount } from '../types/accounts'
import { generateMnemonic } from '@prosopo/contract'
import { registerProvider } from './provider'
import path from 'path'

// Take the root dir from the environment or assume it's the root of this package
function getRootDir() {
    return process.env.ROOT_DIR || path.resolve(__dirname, '../..')
}

function getDefaultProvider(): IProviderAccount {
    return {
        serviceOrigin: process.env.API_PORT ? `http://localhost:${process.env.API_PORT}` : 'http://localhost:3000',
        fee: 10,
        payee: 'Dapp',
        stake: Math.pow(10, 13),
        datasetFile: path.resolve('./data/captchas.json'),
        address: process.env.PROVIDER_ADDRESS || '',
        secret: getSecret(),
        captchaDatasetId: '',
    }
}

function getDefaultDapp(): IDappAccount {
    return {
        serviceOrigin: 'http://localhost:9393',
        secret: '//Eve',
        contractAccount: process.env.DAPP_CONTRACT_ADDRESS || '',
        fundAmount: Math.pow(10, 12),
    }
}

async function copyEnvFile() {
    const rootDir = getRootDir()
    const tplEnvFile = getEnvFile(rootDir, 'env')
    const envFile = getEnvFile(rootDir, '.env')
    await fse.copy(tplEnvFile, envFile, { overwrite: false })
}

function updateEnvFileVar(source: string, name: string, value: string) {
    const envVar = new RegExp(`.*(${name}=)(.*)`, 'g')
    if (envVar.test(source)) {
        return source.replace(envVar, `$1${value}`)
    }
    return source + `\n${name}=${value}`
}

async function updateEnvFile(vars: Record<string, string>) {
    const rootDir = getRootDir()
    const envFile = getEnvFile(rootDir, '.env')

    let readEnvFile = await fse.readFile(envFile, 'utf8')

    for (const key in vars) {
        readEnvFile = updateEnvFileVar(readEnvFile, key, vars[key])
    }

    await fse.writeFile(envFile, readEnvFile)
}

async function registerDapp(env: Environment, dapp: IDappAccount) {
    await setupDapp(env, dapp)
}

export async function setup() {
    const defaultProvider = getDefaultProvider()
    const defaultDapp = getDefaultDapp()
    if (defaultProvider.secret) {
        const hasProviderAccount = defaultProvider.address && defaultProvider.secret
        console.log('ENVIRONMENT', process.env.NODE_ENV)

        const [mnemonic, address] = !hasProviderAccount
            ? await generateMnemonic()
            : [defaultProvider.secret, defaultProvider.address]

        console.log(`Address: ${address}`)
        console.log(`Mnemonic: ${mnemonic}`)
        console.log('Writing .env file...')
        await copyEnvFile()

        if (!process.env.DAPP_CONTRACT_ADDRESS) {
            throw new ProsopoEnvError('DEVELOPER.DAPP_CONTRACT_ADDRESS_MISSING')
        }

        const pairType = getPairType()
        const ss58Format = getSs58Format()
        const secret = '//Alice'
        const pair = await getPair(pairType, ss58Format, secret)
        const env = new Environment(pair)
        await env.isReady()

        defaultProvider.secret = mnemonic

        env.logger.info(`Registering provider... ${defaultProvider.address}`)

        defaultProvider.pair = await getPair(pairType, ss58Format, mnemonic)

        await registerProvider(env, defaultProvider)

        defaultDapp.contractAccount = process.env.DAPP_CONTRACT_ADDRESS

        defaultDapp.pair = await getPair(pairType, ss58Format, defaultDapp.secret)

        env.logger.info('Registering dapp...')
        await registerDapp(env, defaultDapp)

        if (!hasProviderAccount) {
            await updateEnvFile({
                PROVIDER_MNEMONIC: `"${mnemonic}"`,
                PROVIDER_ADDRESS: address,
            })
        }
        process.exit()
    } else {
        console.error('no secret found in .env file')
        throw new ProsopoEnvError(`GENERAL.NO_MNEMONIC_OR_SEED`)
    }
}
//if main process
// if (typeof require !== 'undefined' && require.main === module) {
//     console.info('Running setup as main process')
//
//     setup()
//         .then((r) => console.log('Setup done'))
//         .catch((e) => console.error(e))
// }
