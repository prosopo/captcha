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
import { Abi } from '@polkadot/api-contract'
import { AbiJSON, Wasm } from '../../util/index.js'
import { AccountId, EventRecord } from '@polkadot/types/interfaces'
import { ContractAbi } from '@prosopo/captcha-contract'
import { ContractDeployer } from '@prosopo/contract'
import { ContractFile } from '@prosopo/captcha-contract'
import { LogLevel, getLogger, reverseHexString } from '@prosopo/common'
import { ProviderEnvironment } from '@prosopo/env'
import { defaultConfig, getPairType, getSecret, getSs58Format } from '@prosopo/cli'
import { getPair } from '@prosopo/common'
import { hexToU8a } from '@polkadot/util'
import { loadEnv } from '@prosopo/cli'
import { randomAsHex } from '@polkadot/util-crypto'
import path from 'path'

const log = getLogger(LogLevel.enum.info, 'dev.deploy')

async function deploy(wasm: Uint8Array, abi: Abi, deployerPrefix?: string) {
    const pairType = getPairType()
    const ss58Format = getSs58Format()
    const secret = deployerPrefix ? getSecret(deployerPrefix) : '//Alice'
    const pair = await getPair(pairType, ss58Format, secret)
    const config = defaultConfig()
    const env = new ProviderEnvironment(pair, config)
    await env.isReady()
    log.debug(reverseHexString(env.getApi().createType('u16', 10).toHex().toString()), 'max_user_history_len')
    log.debug(reverseHexString(env.getApi().createType('BlockNumber', 32).toHex().toString()), 'max_user_history_age')
    log.debug(reverseHexString(env.getApi().createType('u16', 1).toHex().toString()), 'min_num_active_providers')
    const params: any[] = []

    const deployer = new ContractDeployer(env.getApi(), abi, wasm, env.pair, params, 0, 0, randomAsHex())
    return await deployer.deploy()
}

export async function run(
    wasmPath: string | undefined,
    abiPath: string | undefined,
    deployer?: string
): Promise<AccountId> {
    // if wasmPath not provided then default to the captcha contract's wasm
    let wasm: Uint8Array
    if (wasmPath === undefined) {
        log.info('Using wasm from captcha contract')
        const hex = JSON.parse(ContractFile)['wasm']
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
    const deployResult = await deploy(wasm, abi, deployer)

    const instantiateEvent: EventRecord | undefined = deployResult.events.find(
        (event) => event.event.section === 'contracts' && event.event.method === 'Instantiated'
    )
    log.info('instantiateEvent', instantiateEvent?.toHuman())
    return (instantiateEvent?.event.data as any)['contract'].toString()
}
// run the script if the main process is running this file
if (typeof require !== 'undefined' && require.main === module) {
    log.info('Loading env from', path.resolve('.'))
    loadEnv(path.resolve('.'))
    run(process.env.CAPTCHA_WASM_PATH, process.env.CAPTCHA_ABI_PATH)
        .then((deployResult) => {
            log.info('Deployed with address', deployResult)
            process.exit(0)
        })
        .catch((e) => {
            console.error(e)
            process.exit(1)
        })
}
