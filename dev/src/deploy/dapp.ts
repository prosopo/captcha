import { Abi } from '@polkadot/api-contract'
import { AccountId, EventRecord } from '@polkadot/types/interfaces'
import { randomAsHex } from '@polkadot/util-crypto'
import { getPair } from '@prosopo/common'
import { ContractDeployer } from '@prosopo/contract'
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
    // initialSupply, faucetAmount, prosopoAccount, humanThreshold, recencyThreshold
    const params = ['1000000000000000', 1000, process.env.PROTOCOL_CONTRACT_ADDRESS, 50, 1000000]
    const deployer = new ContractDeployer(env.api, abi, wasm, env.pair, params, 0, 0, randomAsHex())
    return await deployer.deploy()
}
export async function run(): Promise<AccountId> {
    const wasm = await Wasm(path.resolve(process.env.DAPP_WASM_PATH || '.'))
    const abi = await AbiJSON(path.resolve(process.env.DAPP_ABI_PATH || '.'))
    const deployResult = await deploy(wasm, abi)

    const instantiateEvent: EventRecord | undefined = deployResult.events.find(
        (event) => event.event.section === 'contracts' && event.event.method === 'Instantiated'
    )
    console.log('instantiateEvent', instantiateEvent?.toHuman())
    return instantiateEvent?.event.data['contract'].toString()
}
// run the script if the main process is running this file
if (typeof require !== 'undefined' && require.main === module) {
    loadEnv(path.resolve('../..'))
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
