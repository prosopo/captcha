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
import { AbiJSON, Wasm } from '../../util/index.js'
import { AccountId } from '@prosopo/types'
import { ContractAbi } from '@prosopo/captcha-contract/contract-info'
import { ContractDeployer, getPairAsync } from '@prosopo/contract'
import { ContractFile } from '@prosopo/captcha-contract/contract-info'
import { EventRecord } from '@polkadot/types/interfaces'
import { LogLevel, getLogger } from '@prosopo/common'
import { ProviderEnvironment } from '@prosopo/env'
import { defaultConfig } from '@prosopo/cli'
import { get } from '@prosopo/util'
import { hexToU8a } from '@polkadot/util'
import { randomAsHex } from '@polkadot/util-crypto'
import path from 'path'

const log = getLogger(LogLevel.enum.info, 'scripts.deploy')

async function deploy(wasm: Uint8Array, abi: Abi, deployerPrefix?: string) {
    const config = defaultConfig(undefined, undefined, undefined, undefined, deployerPrefix)
    log.setLogLevel(config.logLevel)
    const network = config.networks[config.defaultNetwork]
    const secret = config.defaultEnvironment === 'development' ? '//Alice' : config.account.secret
    const pair = await getPairAsync(network, secret)
    const env = new ProviderEnvironment(config, pair)
    await env.isReady()
    const params: any[] = []
    const deployer = new ContractDeployer(env.getApi(), abi, wasm, pair, params, 0, 0, randomAsHex(), config.logLevel)
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
    const deployResult = await deploy(wasm, abi, deployer)

    const instantiateEvent: EventRecord | undefined = deployResult.events.find(
        (event) => event.event.section === 'contracts' && event.event.method === 'Instantiated'
    )
    log.info('instantiateEvent', instantiateEvent?.toHuman())

    const contractAddress = String(get(instantiateEvent?.event.data, 'contract'))

    return contractAddress
}
