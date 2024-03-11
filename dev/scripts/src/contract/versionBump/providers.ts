import * as fs from 'fs'
import { ApiPromise, WsProvider } from '@polkadot/api'
import { ContractAbi } from '@prosopo/types'
import { ProsopoCaptchaContract } from '@prosopo/contract'
import { ProviderEnvironment } from '@prosopo/env'
import { defaultConfig } from '@prosopo/cli'
import { deployProtocol } from '../index.js'
import { registerProvider } from '../../index.js'
import type { KeyringPair } from '@polkadot/keyring/types'

interface TransferProvider {
    address: string
    secret: string
}

export const TransferProviders = async (
    providersJSON: string,
    oldContractAddress: string,
    oldContractAbiPath: string
) => {
    // Load the old contract and the providers
    const oldContractProviders = await getOldProviderDetails(oldContractAddress, providersJSON, oldContractAbiPath)

    // Deploy the new contract
    const protocolContractAddress = await deployProtocol(
        process.env.PROSOPO_CAPTCHA_WASM_PATH,
        process.env.PROSOPO_CAPTCHA_ABI_PATH
    )

    // Register the providers in the new contract
    oldContractProviders.forEach(async (provider) => {
        const config = defaultConfig()
        const network = config.networks[config.defaultNetwork]
        const secret = deployerPrefix ? getSecret(deployerPrefix) : '//Alice'
        const pair = await getPairAsync(network, secret)
        const env = new ProviderEnvironment(defaultConfig(), pair)
        await registerProvider(env)
    })
}

export const getOldProviderDetails = async (
    oldContractAddress: string,
    providersJson: string,
    oldContractJson: string
) => {
    const contract = await loadContract(oldContractAddress, oldContractJson)
    const providers = JSON.parse(fs.readFileSync(providersJson, 'utf-8')) as TransferProvider[]

    return providers.map(async (provider) => {
        const contractProvider = (await contract.methods.getProvider(provider.address, {})).value.unwrap().unwrap()
        return { ...contractProvider, ...provider }
    })
}

const loadContract = async (
    contractAddress: string,
    contractAbiJSON: string,
    pair?: KeyringPair
): Promise<ProsopoCaptchaContract> => {
    const config = defaultConfig()
    const network = config.networks[config.defaultNetwork]
    const api = await ApiPromise.create({ provider: new WsProvider(network.endpoint), initWasm: false })
    const oldContract = JSON.parse(fs.readFileSync(contractAbiJSON, 'utf-8')) as ContractAbi
    return new ProsopoCaptchaContract(api, oldContract, contractAddress, 'prosopo', 0, pair)
}
