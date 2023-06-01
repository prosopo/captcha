import { Abi } from '@polkadot/api-contract'
import { AbiJSON, Wasm } from '../../util'
import { AccountId, EventRecord } from '@polkadot/types/interfaces'
import { ContractDeployer, oneUnit } from '@prosopo/contract'
import { Environment } from '@prosopo/env'
import { defaultConfig, getPairType, getSs58Format, loadEnv } from '@prosopo/cli'
import { getPair, reverseHexString } from '@prosopo/common'
import { randomAsHex } from '@polkadot/util-crypto'
import path from 'path'

async function deploy(wasm: Uint8Array, abi: Abi) {
    const pairType = getPairType()
    const ss58Format = getSs58Format()
    const pair = await getPair(pairType, ss58Format, '//Alice')
    const env = new Environment(pair, defaultConfig())
    await env.isReady()
    console.log(reverseHexString(env.api.createType('u16', 10).toHex().toString()), 'max_user_history_len')
    console.log(reverseHexString(env.api.createType('BlockNumber', 32).toHex().toString()), 'max_user_history_age')
    console.log(reverseHexString(env.api.createType('u16', 1).toHex().toString()), 'min_num_active_providers')
    const params = [
        env.api.consts.balances.existentialDeposit, // provider_stake_threshold Balance
        env.api.consts.balances.existentialDeposit, // dapp_stake_threshold Balance
        env.api.createType('u16', 10), // max_user_history_len u16
        env.api.createType('BlockNumber', 32), // max_user_history_age BlockNumber
        env.api.createType('u16', 1), // min_num_active_providers u16
        oneUnit(env.api).divn(1000), // max_provider_fee Balance
    ]

    const deployer = new ContractDeployer(env.api, abi, wasm, env.pair, params, 0, 0, randomAsHex())
    return await deployer.deploy()
}

export async function run(wasmPath: string, abiPath: string): Promise<AccountId> {
    const wasm = await Wasm(path.resolve(wasmPath))
    const abi = await AbiJSON(path.resolve(abiPath))
    const deployResult = await deploy(wasm, abi)

    const instantiateEvent: EventRecord | undefined = deployResult.events.find(
        (event) => event.event.section === 'contracts' && event.event.method === 'Instantiated'
    )
    console.log('instantiateEvent', instantiateEvent?.toHuman())
    return instantiateEvent?.event.data['contract'].toString()
}
// run the script if the main process is running this file
if (typeof require !== 'undefined' && require.main === module) {
    console.log('Loading env from', path.resolve('.'))
    loadEnv(path.resolve('.'))
    if (!process.env.CAPTCHA_WASM_PATH || !process.env.CAPTCHA_ABI_PATH) {
        throw new Error('Missing protocol wasm or abi path')
    }
    run(process.env.CAPTCHA_WASM_PATH, process.env.CAPTCHA_ABI_PATH)
        .then((deployResult) => {
            console.log('Deployed with address', deployResult)
            process.exit(0)
        })
        .catch((e) => {
            console.error(e)
            process.exit(1)
        })
}
