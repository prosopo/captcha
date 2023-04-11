import { ContractDeployer } from '@prosopo/contract'
import { Environment, getPair, getPairType, getSs58Format, oneUnit } from '@prosopo/provider'
import { Abi } from '@polkadot/api-contract'
import { randomAsHex } from '@polkadot/util-crypto'
import { AbiJSON, Wasm } from '../util'
import { loadEnv } from '../cli/env'
import path from 'path'
import { AccountId, EventRecord } from '@polkadot/types/interfaces'

loadEnv()

async function deploy(wasm: Uint8Array, abi: Abi) {
    const pairType = getPairType()
    const ss58Format = getSs58Format()
    const pair = await getPair(pairType, ss58Format, '//Alice')
    const env = new Environment(pair)
    await env.isReady()
    const params = [
        ['5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty'], // Alice , Bob
        1, // providerStakeDefault
        1, // dappStakeDefault
        10, // commitments to store per user
        1000000000, // time limit
        1, // minimum number of active providers
        oneUnit(env.api).divn(1000), // max price per commitment
    ]

    const deployer = new ContractDeployer(env.api, abi, wasm, env.pair, params, 0, 0, randomAsHex())
    return await deployer.deploy()
}
export async function run(): Promise<AccountId> {
    const wasm = await Wasm(path.resolve(process.env.WASM_PATH || '.'))
    const abi = await AbiJSON(path.resolve(process.env.ABI_PATH || '.'))
    const deployResult = await deploy(wasm, abi)

    const instantiateEvent: EventRecord | undefined = deployResult.events.find(
        (event) => event.event.section === 'contracts' && event.event.method === 'Instantiated'
    )
    console.log('instantiateEvent', instantiateEvent?.toHuman())
    return instantiateEvent?.event.data['contract'].toString()
}
// run the script if the main process is running this file
if (typeof require !== 'undefined' && require.main === module) {
    run()
        .then((deployResult) => {
            console.log('Deployed with address', deployResult)
            process.exit(0)
        })
        .catch((e) => {
            console.error(e)
            process.exit(1)
        })
}
