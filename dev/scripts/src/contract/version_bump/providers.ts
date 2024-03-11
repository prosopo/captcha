import * as fs from 'fs'
import * as z from 'zod'
import { ApiPromise, WsProvider } from '@polkadot/api'
import { ProsopoCaptchaContract, getPairAsync } from '@prosopo/contract'
import { ContractAbi as abiJson } from '@prosopo/captcha-contract/contract-info'
import { defaultConfig } from '@prosopo/cli'
import type { KeyringPair } from '@polkadot/keyring/types'

interface TransferProvider {
    address: string
    secret: string
}

export const TransferProviders = async (
    providers: TransferProvider[],
    oldContractAddress: string,
    newContractAddress: string,
    oldContractAbiPath: string,
    newContractAbiPath: string
) => {
    providers.map(async (provider) => {
        const config = defaultConfig()
        const network = config.networks[config.defaultNetwork]
        const pair = await getPairAsync(network, provider.secret)

        const api = await ApiPromise.create({ provider: new WsProvider(network.endpoint), initWasm: false })

        const oldContract = new ProsopoCaptchaContract(api, JSON.parse(abiJson), oldContractAddress, 'prosopo', 0, pair)

        // Query Provider from old contract
        const result = (await oldContract.query.getProvider(z.string().parse(provider.address), {})).value
            .unwrap()
            .unwrap()
    })
}

export const getOldProviderDetails = async (oldContractAddress: string, providersJson: string) => {
    const contract = await loadContract(oldContractAddress)
    const providers = JSON.parse(fs.readFileSync(providersJson, 'utf-8')) as TransferProvider[]

    return providers.map(async (provider) => {
        const contractProvider = (await contract.methods.getProvider(provider.address, {})).value.unwrap().unwrap()
        return { ...contractProvider, ...provider }
    })
}

const loadContract = async (contractAddress: string, pair?: KeyringPair): Promise<ProsopoCaptchaContract> => {
    const config = defaultConfig()
    const network = config.networks[config.defaultNetwork]
    const api = await ApiPromise.create({ provider: new WsProvider(network.endpoint), initWasm: false })
    return new ProsopoCaptchaContract(api, JSON.parse(abiJson), contractAddress, 'prosopo', 0, pair)
}
