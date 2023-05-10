import { Abi } from '@polkadot/api-contract'
import { AccountId, EventRecord } from '@polkadot/types/interfaces'
import { randomAsHex } from '@polkadot/util-crypto'
import { getPair } from '@prosopo/common'
import { ContractDeployer, oneUnit } from '@prosopo/contract'
import { getPairType, getSs58Format, loadEnv } from '@prosopo/env'
import { Environment } from '@prosopo/provider'
import path from 'path'
import { AbiJSON, Wasm } from '../util'

async function deploy(wasm: Uint8Array, abi: Abi) {
    const pairType = getPairType()
    const ss58Format = getSs58Format()
    const pair = await getPair(pairType, ss58Format, '//Alice')
    const env = new Environment(pair)
    await env.isReady()
    const params = [
        ['5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty'], // Alice , Bob
        env.api.consts.balances.existentialDeposit, // providerStakeDefault
        env.api.consts.balances.existentialDeposit, // dappStakeDefault
        10, // commitments to store per user
        1000000000, // time limit
        1, // minimum number of active providers
        oneUnit(env.api).divn(1000), // max price per commitment
    ]

    const deployer = new ContractDeployer(env.api, abi, wasm, env.pair, params, 0, 0, randomAsHex())
    return await deployer.deploy()
}
<<<<<<< HEAD
export async function run(): Promise<AccountId> {
    const wasm = await Wasm(path.resolve(process.env.PROTOCOL_WASM_PATH || '.'))
    const abi = await AbiJSON(path.resolve(process.env.PROTOCOL_ABI_PATH || '.'))
=======
export async function run(wasmPath: string, abiPath: string): Promise<AccountId> {
    const wasm = await Wasm(path.resolve(wasmPath))
    const abi = await AbiJSON(path.resolve(abiPath))
>>>>>>> main
    const deployResult = await deploy(wasm, abi)

    const instantiateEvent: EventRecord | undefined = deployResult.events.find(
        (event) => event.event.section === 'contracts' && event.event.method === 'Instantiated'
    )
    console.log('instantiateEvent', instantiateEvent?.toHuman())
    return instantiateEvent?.event.data['contract'].toString()
}
// run the script if the main process is running this file
if (typeof require !== 'undefined' && require.main === module) {
<<<<<<< HEAD
    loadEnv(path.resolve('../..'))
    run()
=======
    console.log('Loading env from', path.resolve('.'))
    loadEnv(path.resolve('.'))
    if (!process.env.PROTOCOL_WASM_PATH || !process.env.PROTOCOL_ABI_PATH) {
        throw new Error('Missing protocol wasm or abi path')
    }
    run(process.env.PROTOCOL_WASM_PATH, process.env.PROTOCOL_ABI_PATH)
>>>>>>> main
        .then((deployResult) => {
            console.log('Deployed with address', deployResult)
            process.exit(0)
        })
        .catch((e) => {
            console.error(e)
            process.exit(1)
        })
}
