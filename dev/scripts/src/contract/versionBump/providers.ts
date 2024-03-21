import { ApiPromise, WsProvider } from '@polkadot/api'
import { ContractAbi } from '@prosopo/types'
import { KeyringPair$Json } from '@polkadot/keyring/types'
import { ProsopoCaptchaContract, wrapQuery } from '@prosopo/contract'
import { ProviderEnvironment } from '@prosopo/env'
import { Tasks } from '@prosopo/provider'
import { ContractAbi as abiJson } from '@prosopo/captcha-contract/contract-info'
import { defaultConfig } from '@prosopo/cli'
import { deployProtocol } from '../index.js'
import { getSendAmount, getStakeAmount, sendFunds } from '../../setup/funds.js'
import fs from 'fs'
import type { KeyringPair } from '@polkadot/keyring/types'
import type { ReturnNumber } from '@prosopo/typechain-types'

interface TransferProvider {
    address: string
    secret: KeyringPair$Json
}

export const TransferProviders = async (
    providersJSON: string,
    oldContractAddress: string,
    oldContractAbiPath: string
) => {
    console.log('starting')
    // Load the old contract and the providers
    const oldContractProviders = await getOldProviderDetails(oldContractAddress, providersJSON, oldContractAbiPath)

    console.log('oldContractProviders', oldContractProviders)

    // Deploy the new contract
    const protocolContractAddress = await deployProtocol(
        process.env.PROSOPO_CAPTCHA_WASM_PATH,
        process.env.PROSOPO_CAPTCHA_ABI_PATH
    )

    console.log(protocolContractAddress.toString())

    const newContract = await loadContract(protocolContractAddress.toString(), abiJson)

    // Register the providers in the new contract
    for (const provider of oldContractProviders) {
        const env = new ProviderEnvironment(defaultConfig())

        const providerKeyringPair: KeyringPair = env.keyring.addFromJson(provider.secret as KeyringPair$Json)

        const result: ReturnNumber = await wrapQuery(
            env.getContractInterface().query.getProviderStakeThreshold,
            env.getContractInterface().query
        )()
        const stakeAmount = result.rawNumber

        // use the minimum stake amount from the contract to create a reasonable stake amount
        const stake = getStakeAmount(env, stakeAmount)
        const sendAmount = getSendAmount(env, stake)

        // send enough funds to cover the stake amount and more
        await sendFunds(env, provider.address, 'Provider', sendAmount)

        await env.changeSigner(providerKeyringPair)
        const tasks = new Tasks(env)
        const providerRegisterArgs: Parameters<typeof tasks.contract.query.providerRegister> = [
            provider.url,
            provider.fee,
            provider.payee,
            {
                value: 0,
            },
        ]
        let providerExists = false
        try {
            await wrapQuery(tasks.contract.query.providerRegister, tasks.contract.query)(...providerRegisterArgs)
        } catch (e) {
            if (e === 'ProviderExists') {
                providerExists = true
            } else {
                throw e
            }
        }

        if (!providerExists) {
            await tasks.contract.tx.providerRegister(...providerRegisterArgs)
        }
        const registeredProvider = await wrapQuery(
            tasks.contract.query.getProvider,
            tasks.contract.query
        )(provider.address)

        console.log(registeredProvider)

        const providerUpdateArgs: Parameters<typeof tasks.contract.query.providerUpdate> = [
            provider.url,
            provider.fee,
            provider.payee,
            {
                value: stake,
            },
        ]

        // Do this to catch any errors before running the tx
        await wrapQuery(tasks.contract.query.providerUpdate, tasks.contract.query)(...providerUpdateArgs)

        await tasks.contract.tx.providerUpdate(...providerUpdateArgs)

        // catch any errors before running the tx
        await wrapQuery(newContract.query.providerSetDataset, newContract.query)(
            provider.datasetId,
            provider.datasetIdContent
        )
        const txResult = await newContract.methods.providerSetDataset(provider.datasetId, provider.datasetIdContent, {
            value: 0,
        })

        console.log(txResult)
    }
}

export const getOldProviderDetails = async (
    oldContractAddress: string,
    providersJson: string,
    oldContractJson: string
) => {
    console.log('starting getOldProviderDetails')
    const contract = await loadContract(oldContractAddress, oldContractJson)

    console.log('contract', contract)
    const providers = JSON.parse(fs.readFileSync(providersJson, 'utf-8')) as TransferProvider[]

    return await Promise.all(
        providers.map(async (provider) => {
            const contractProvider = (await contract.methods.getProvider(provider.address, {})).value.unwrap().unwrap()
            return { ...contractProvider, ...provider }
        })
    )
}

const loadContract = async (
    contractAddress: string,
    contractAbiJSON: string,
    pair?: KeyringPair
): Promise<ProsopoCaptchaContract> => {
    console.log('starting loadContract')
    const config = defaultConfig()
    const network = config.networks[config.defaultNetwork]
    console.log('network', network)

    const provider = new WsProvider(network.endpoint)
    console.log('provider', provider.endpoint)
    // THIS SILENTLY KILLS THE PROCESS AND I HAVE NO IDEA WHY --
    const api = await ApiPromise.create({ provider, initWasm: false })
        .then((api) => {
            console.log(api.type, 'aisudnflaisdhbnfliasuhbfilnb')
            return api
        })
        .catch((err) => {
            console.error(err)
            throw new Error('Error creating API')
        })

    const oldContract = JSON.parse(fs.readFileSync(contractAbiJSON, 'utf-8')) as ContractAbi
    console.log('oldContract', oldContract)
    return new ProsopoCaptchaContract(api, oldContract, contractAddress, 'prosopo', 0, pair)
}

const run = async () => {
    const oldContractAddress = '5HiVWQhJrysNcFNEWf2crArKht16zrhro3FcekVWocyQjx5u'
    const providersJson = 'providers.json'
    const oldContractAbiPath = 'captcha.json'

    const config = defaultConfig()
    const network = config.networks[config.defaultNetwork]
    const provider = new WsProvider(network.endpoint)
    console.log('provider', provider.endpoint)
    // THIS SILENTLY KILLS THE PROCESS AND I HAVE NO IDEA WHY --
    console.log('here')
    const api = await ApiPromise.create({ provider, noInitWarn: true })
    console.log('here2')
    //await TransferProviders(providersJson, oldContractAddress, oldContractAbiPath)

    console.log('how far did we get?')
}

run()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(-1)
    })
