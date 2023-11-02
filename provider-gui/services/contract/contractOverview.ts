import { ApiPromise, Keyring, WsProvider } from '@polkadot/api'
import { GovernanceStatus } from '@prosopo/captcha-contract'
import { ProcaptchaClientConfigOutput } from '@prosopo/types'
import { ProsopoCaptchaContract } from '@prosopo/contract'
import { ContractAbi as abiJson } from '@prosopo/captcha-contract'
import { hexToString } from '@polkadot/util'

const deployedContracts = {
    rococo: {
        wsProviderUrl: 'wss://rococo-contracts-rpc.polkadot.io:443',
        contracts: ['5HiVWQhJrysNcFNEWf2crArKht16zrhro3FcekVWocyQjx5u'],
    },
    development: { wsProviderUrl: 'ws://localhost:9944', contracts: [] },
}

export const getNetwork = (config: ProcaptchaClientConfigOutput) => {
    const network = config.networks[config.defaultNetwork]
    if (!network) {
        throw new Error(`No network found for environment ${config.defaultEnvironment}`)
    }
    return network
}

const loadContract = async (
    account: string,
    contractAddress: string,
    wsProviderUrl: string
): Promise<ProsopoCaptchaContract> => {
    const network = {
        endpoint: wsProviderUrl,
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
    const contracts = deployedContracts[network].contracts

    const contractData = await Promise.all(
        contracts.map(async (contractAddress) => {
            const contractApi = await loadContract(
                accountAddress,
                contractAddress,
                deployedContracts[network].wsProviderUrl
            )
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
