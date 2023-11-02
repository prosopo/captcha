import { ApiPromise, Keyring, WsProvider } from '@polkadot/api'
import {
    EnvironmentTypesSchema,
    NetworkNamesSchema,
    ProcaptchaClientConfigOutput,
    ProcaptchaConfigSchema,
} from '@prosopo/types'
import { GovernanceStatus } from '@prosopo/captcha-contract'
import { ProcaptchaConfigOptional } from '@prosopo/procaptcha'
import { ProsopoCaptchaContract } from '@prosopo/contract'
import { ContractAbi as abiJson } from '@prosopo/captcha-contract'
import { hexToString } from '@polkadot/util'

const deployedContracts = { rococo: ['5HiVWQhJrysNcFNEWf2crArKht16zrhro3FcekVWocyQjx5u'], development: [] }

const getConfig = (siteKey?: string): ProcaptchaConfigOptional => {
    if (!siteKey) {
        siteKey = process.env.DAPP_SITE_KEY || process.env.PROSOPO_SITE_KEY || process.env.REACT_APP_DAPP_SITE_KEY || ''
    }
    return ProcaptchaConfigSchema.parse({
        defaultEnvironment: process.env.DEFAULT_ENVIRONMENT
            ? EnvironmentTypesSchema.parse(process.env.DEFAULT_ENVIRONMENT)
            : EnvironmentTypesSchema.enum.development,
        defaultNetwork: process.env.DEFAULT_NETWORK
            ? NetworkNamesSchema.parse(process.env.DEFAULT_NETWORK)
            : NetworkNamesSchema.enum.development,
        userAccountAddress: '',
        account: {
            address: siteKey,
        },
        serverUrl: process.env.SERVER_URL || '',
    })
}

export const getNetwork = (config: ProcaptchaClientConfigOutput) => {
    const network = config.networks[config.defaultNetwork]
    if (!network) {
        throw new Error(`No network found for environment ${config.defaultEnvironment}`)
    }
    return network
}

const loadContract = async (account: string, contractAddress: string): Promise<ProsopoCaptchaContract> => {
    const network = {
        endpoint: 'wss://rococo-contracts-rpc.polkadot.io:443',
        contract: {
            address: contractAddress,
            name: 'Captcha',
        },
        pairType: 'sr25519',
        ss58Format: 'number',
    }
    const api = await ApiPromise.create({ provider: new WsProvider(network.endpoint) })
    const type = 'sr25519'
    return new ProsopoCaptchaContract(
        api,
        JSON.parse(abiJson),
        network.contract.address,
        'prosopo',
        0,
        new Keyring({ type, ss58Format: api.registry.chainSS58 }).addFromAddress(account)
    )
}

export const contractOverview = async (network: 'rococo' | 'development', accountAddress: string) => {
    const contracts = deployedContracts[network]

    const contractData = await Promise.all(
        contracts.map(async (contractAddress) => {
            const contractApi = await loadContract(accountAddress, contractAddress)
            const providersResult = await contractApi.methods.listProvidersByStatus(
                [GovernanceStatus.active, GovernanceStatus.inactive],
                {}
            )
            const providers = await Promise.all(
                providersResult.value
                    .unwrap()
                    .unwrap()
                    .map(async (provider) => {
                        // Check if the provider url is online
                        const url = `${hexToString(provider.url.toString())}/v1/prosopo/provider/status`
                        const isOnline = await fetch(url)
                            .then((res) => res.status === 200)
                            .catch(() => false)
                        return {
                            status: provider.status.toString(),
                            balance: provider.balance.toNumber(),
                            fee: provider.fee.toString(),
                            payee: provider.payee.toString(),
                            url: url,
                            datasetId: provider.datasetId.toString(),
                            datasetIdContent: provider.datasetIdContent.toString(),
                            isOnline,
                        }
                    })
            )

            return {
                contractAddress: contractAddress,
                network: network,
                gitCommitId: 'gitCommitId.value.unwrap()',
                providers,
            }
        })
    )

    return contractData
}
