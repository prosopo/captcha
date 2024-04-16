// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import { Abi } from '@polkadot/api-contract'
import { AbiJSON, Wasm } from '../util/index.js'
import { ContractAbi } from '@prosopo/captcha-contract/contract-info'
import { ContractFile } from '@prosopo/captcha-contract/contract-info'
import { LogLevel, getLogger } from '@prosopo/common'
import { ProviderEnvironment } from '@prosopo/env'
import { TransactionQueue } from '@prosopo/tx'
import { defaultConfig } from '@prosopo/cli'
import { getPairAsync, oneUnit } from '@prosopo/contract'
import { hexToU8a } from '@polkadot/util'
import { loadEnv } from '@prosopo/cli'
import { setupDapp } from '../setup/index.js'
import mongoose, { Model } from 'mongoose'
import path from 'path'

const log = getLogger(LogLevel.enum.info, 'dev.deploy')

interface Emails {
    email: string
    name: string
    url: string
    account: string
    mnemonic: string
    createdAt: number
    marketingPreferences: boolean
}

const EmailModelSchema = new mongoose.Schema<Emails>(
    {
        email: String,
        name: String,
        url: String,
        account: String,
        mnemonic: String,
        createdAt: Number,
        marketingPreferences: Boolean,
    },
    { collection: 'emails' }
)

let EmailsModel: typeof Model<Emails>
try {
    EmailsModel = mongoose.model('emails')
} catch (error) {
    EmailsModel = mongoose.model('emails', EmailModelSchema)
}

export async function run(wasmPath: string | undefined, abiPath: string | undefined, atlasUri?: string) {
    // if wasmPath not provided then default to the captcha contract's wasm
    let wasm: Uint8Array
    if (wasmPath === undefined) {
        log.info('Using wasm from captcha contract')
        const jsonContent = JSON.parse(ContractFile)
        const hex = jsonContent['source']['wasm']
        wasm = hexToU8a(hex)
    } else {
        log.info('WASM Path', wasmPath)
        wasm = await Wasm(path.resolve(wasmPath))
    }
    // if abiPath not provided then default to the captcha contract's abi
    let abi: Abi
    if (abiPath === undefined) {
        log.info('Using abi from captcha contract')
        abi = new Abi(ContractAbi)
    } else {
        log.info('ABI Path', abiPath)
        abi = await AbiJSON(path.resolve(abiPath))
    }

    if (!atlasUri) {
        throw new Error('Atlas URI not found in env')
    }
    await mongoose.connect(atlasUri, { dbName: 'prosopo' })

    const dapps = await EmailsModel.find({}).exec()
    log.info(dapps)

    const config = defaultConfig()
    const network = config.networks[config.defaultNetwork]
    const secret = config.account.secret
    const pair = await getPairAsync(network, secret)
    const env = new ProviderEnvironment(config, pair)
    await env.isReady()
    const queue = new TransactionQueue(env.getApi(), pair, config.logLevel)
    if (!config.account.address) {
        throw new Error('Account address not found in config')
    }
    if (!secret) {
        throw new Error('Account secret not found in config')
    }
    const fundAmount = oneUnit(env.getApi())
    await Promise.all(
        dapps
            .filter((dappRecord) => dappRecord.account)
            .map((dappRecord) => setupDapp(env, { pair, secret, fundAmount }, dappRecord.account, queue))
    )
}
log.info('Loading env from', path.resolve('.'))
loadEnv(path.resolve('.'))
run(process.env.PROSOPO_CAPTCHA_WASM_PATH, process.env.PROSOPO_CAPTCHA_ABI_PATH, process.env._DEV_ONLY_ATLAS_URI)
    .then((result) => {
        log.info(result)
        process.exit(0)
    })
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
