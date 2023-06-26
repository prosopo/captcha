import { Abi } from '@polkadot/api-contract'
import { AbiJSON, Wasm } from '../../util'
import { AccountId, EventRecord } from '@polkadot/types/interfaces'
import { ContractDeployer, oneUnit } from '@prosopo/contract'
import { Environment } from '@prosopo/env'
import { LogLevel, logger, reverseHexString } from '@prosopo/common'
import { defaultConfig, getPairType, getSs58Format, loadEnv } from '@prosopo/cli'
import { getPair } from '@prosopo/common'
import { randomAsHex } from '@polkadot/util-crypto'
import path from 'path'

const log = logger(LogLevel.Info, 'dev.deploy')

async function deploy(wasm: Uint8Array, abi: Abi) {
    const pairType = getPairType()
    const ss58Format = getSs58Format()
    const pair = await getPair(pairType, ss58Format, '//Alice')
    const env = new Environment(pair, defaultConfig())
    await env.isReady()
    log.debug(reverseHexString(env.api.createType('u16', 10).toHex().toString()), 'max_user_history_len')
    log.debug(reverseHexString(env.api.createType('BlockNumber', 32).toHex().toString()), 'max_user_history_age')
    log.debug(reverseHexString(env.api.createType('u16', 1).toHex().toString()), 'min_num_active_providers')
    const params = []

    const deployer = new ContractDeployer(env.api, abi, wasm, env.pair, params, 0, 0, randomAsHex())
    return await deployer.deploy()
}

export async function run(wasmPath: string, abiPath: string): Promise<AccountId> {
    log.info('WASM Path', wasmPath)
    log.info('ABI Path', abiPath)
    const wasm = await Wasm(path.resolve(wasmPath))
    const abi = await AbiJSON(path.resolve(abiPath))
    const deployResult = await deploy(wasm, abi)

    const instantiateEvent: EventRecord | undefined = deployResult.events.find(
        (event) => event.event.section === 'contracts' && event.event.method === 'Instantiated'
    )
    log.info('instantiateEvent', instantiateEvent?.toHuman())
    return instantiateEvent?.event.data['contract'].toString()
}
// run the script if the main process is running this file
if (typeof require !== 'undefined' && require.main === module) {
    log.info('Loading env from', path.resolve('.'))
    loadEnv(path.resolve('.'))
    if (!process.env.CAPTCHA_WASM_PATH || !process.env.CAPTCHA_ABI_PATH) {
        throw new Error('Missing protocol wasm or abi path')
    }
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
