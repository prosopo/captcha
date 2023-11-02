import { ApiPromise, Keyring, WsProvider } from '@polkadot/api'
import { GovernanceStatus } from '@prosopo/captcha-contract'
import { ProcaptchaClientConfigOutput } from '@prosopo/types'
import { ProsopoCaptchaContract } from '@prosopo/contract'
import { ContractAbi as abiJson } from '@prosopo/captcha-contract'

const deployedContracts = { rococo: ['5HiVWQhJrysNcFNEWf2crArKht16zrhro3FcekVWocyQjx5u'], development: [] }

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
            const gitCommitId = await contractApi.methods.getGitCommitId({})
            const providersResult = await contractApi.methods.listProvidersByStatus(
                [GovernanceStatus.active, GovernanceStatus.inactive],
                {}
            )
            const providers = providersResult.value
                .unwrap()
                .unwrap()
                .map((provider) => {
                    return {
                        status: provider.status.toString(),
                        balance: provider.balance.toNumber(),
                        fee: provider.fee.toString(),
                        payee: provider.payee.toString(),
                        url: provider.url.toString(),
                        datasetId: provider.datasetId.toString(),
                        datasetIdContent: provider.datasetIdContent.toString(),
                    }
                })

            return {
                contractAddress: contractAddress,
                network: network,
                gitCommitId: gitCommitId.value.unwrap(),
                providers,
            }
        })
    )

    return contractData
}
