// Copyright 2021-2024 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { ApiPromise, Keyring, WsProvider } from '@polkadot/api'
import { GovernanceStatus } from '@prosopo/captcha-contract'
import { GuiContract } from '@/types/ContractOverview'
import { NetworkNames, ProcaptchaClientConfigOutput, ProsopoBasicConfigOutput } from '@prosopo/types'
import { ProsopoCaptchaContract } from '@prosopo/contract'
import { ProsopoEnvError } from '@prosopo/common'
import { ContractAbi as abiJson } from '@prosopo/captcha-contract'
import { getConfig } from './config'
import { hexToString } from '@polkadot/util'

export const getNetwork = (config: ProcaptchaClientConfigOutput) => {
    const network = config.networks[config.defaultNetwork]
    if (!network) {
        throw new ProsopoEnvError('DEVELOPER.NETWORK_NOT_FOUND', { context: { network: config.defaultNetwork } })
    }
    return network
}

const loadContract = async (
    account: string,
    contractAddress: string,
    wsProviderUrl: string | string[]
): Promise<ProsopoCaptchaContract> => {
    const api = await ApiPromise.create({ provider: new WsProvider(wsProviderUrl) })
    const type = 'sr25519'
    return new ProsopoCaptchaContract(
        api,
        JSON.parse(abiJson),
        contractAddress,
        'prosopo',
        0,
        new Keyring({ type, ss58Format: api.registry.chainSS58 }).addFromAddress(account)
    )
}

export const contractOverview = async (
    network: NetworkNames,
    accountAddress: string,
    contracts: GuiContract[],
    contractAddress?: string
) => {
    console.log(contractAddress)
    const config = getConfig('development', network)
    const contract = contractAddress
        ? { address: contractAddress, name: 'Captcha' }
        : getConfig('development', network).networks[network].contract

    if (contracts.map((c) => c.contractAddress).includes(contract.address)) {
        throw new Error(
            `Contract already in global context: ${contracts.find((c) => c.contractAddress === contract.address)}`
        )
    }

    return await getContract(accountAddress, contract, config, network)
}

const getContract = async (
    accountAddress: string,
    contract: { address: string; name: string },
    config: ProsopoBasicConfigOutput,
    network: NetworkNames
): Promise<GuiContract> => {
    const contractApi = await loadContract(accountAddress, contract.address, config.networks[network].endpoint)
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
                    url: hexToString(provider.url.toString()),
                    datasetId: provider.datasetId.toString(),
                    datasetIdContent: provider.datasetIdContent.toString(),
                    isOnline,
                }
            })
    )

    return {
        contractAddress: contract.address,
        network: network,
        providers,
    }
}
