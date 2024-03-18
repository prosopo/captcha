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
import { ApiPromise } from '@polkadot/api/promise/Api'
import { ExtensionWeb2 } from '@prosopo/account'
import { Keyring } from '@polkadot/keyring'
import {
    ProcaptchaCallbacks,
    ProcaptchaClientConfigInput,
    ProcaptchaClientConfigOutput,
    ProcaptchaConfigSchema,
    ProcaptchaState,
    ProcaptchaStateUpdateFn,
} from '@prosopo/types'
import { ProsopoCaptchaContract, wrapQuery } from '@prosopo/contract'
import { ProsopoEnvError, trimProviderUrl } from '@prosopo/common'
import { ProviderApi } from '@prosopo/api'
import { RandomProvider } from '@prosopo/captcha-contract/types-returns'
import { WsProvider } from '@polkadot/rpc-provider/ws'
import { ContractAbi as abiJson } from '@prosopo/captcha-contract/contract-info'
import { getDefaultEvents } from '@prosopo/procaptcha-common'
import { solvePoW } from './SolverService.js'

export const Manager = async (
    configInput: ProcaptchaClientConfigInput,
    state: ProcaptchaState,
    onStateUpdate: ProcaptchaStateUpdateFn,
    callbacks: ProcaptchaCallbacks
) => {
    const getConfig = () => {
        const config: ProcaptchaClientConfigInput = {
            userAccountAddress: '',
            ...configInput,
        }

        return ProcaptchaConfigSchema.parse(config)
    }

    const getNetwork = (config: ProcaptchaClientConfigOutput) => {
        const network = config.networks[config.defaultNetwork]
        if (!network) {
            throw new ProsopoEnvError('DEVELOPER.NETWORK_NOT_FOUND', {
                context: { error: `No network found for environment ${config.defaultEnvironment}` },
            })
        }
        return network
    }
    /**
     * Load the contract instance using addresses from config.
     */
    const loadContract = async (): Promise<ProsopoCaptchaContract> => {
        const network = getNetwork(getConfig())
        const api = await ApiPromise.create({ provider: new WsProvider(network.endpoint), initWasm: false })
        const type = 'sr25519'
        const keyring = new Keyring({ type, ss58Format: api.registry.chainSS58 })

        return new ProsopoCaptchaContract(
            api,
            JSON.parse(abiJson),
            network.contract.address,
            'prosopo',
            0,
            keyring.addFromAddress(getConfig().account.address || '')
        )
    }

    const config = getConfig()
    // check if account has been provided in config (doesn't matter in web2 mode)
    if (!config.web2 && !config.userAccountAddress) {
        throw new ProsopoEnvError('GENERAL.ACCOUNT_NOT_FOUND', {
            context: { error: 'Account address has not been set for web3 mode' },
        })
    }

    // check if account exists in extension
    const ext = new ExtensionWeb2()
    const account = await ext.getAccount(config)

    const contract = await loadContract()

    const events = getDefaultEvents(onStateUpdate, state, callbacks)

    // get a random provider
    const getRandomProviderResponse: RandomProvider = await wrapQuery(
        contract.query.getRandomActiveProvider,
        contract.query
    )(account.account.address, configInput.account.address || '')

    const providerUrl = trimProviderUrl(getRandomProviderResponse.provider.url.toString())

    const providerApi = new ProviderApi(getNetwork(getConfig()), providerUrl, configInput.account.address || '')

    const challenge = await providerApi.getPowCaptchaChallenge(
        account.account.address,
        configInput.account.address || ''
    )

    const solution = solvePoW(challenge.challenge, challenge.difficulty)

    const verifiedSolution = await providerApi.submitPowCaptchaSolution(
        challenge,
        account.account.address,
        configInput.account.address || '',
        getRandomProviderResponse,
        solution
    )

    // pass { challenge, dappAccount } to server to verify the captcha
    // if (verifiedSolution.verified) {
    //     updateState({ isHuman: true, loading: false })
    //     events.onHuman({
    //         [ApiParams.providerUrl]: providerUrlFromStorage,
    //         [ApiParams.user]: account.account.address,
    //         [ApiParams.dapp]: getDappAccount(),
    //         [ApiParams.blockNumber]: verifyDappUserResponse.blockNumber,
    //     })
    //     setValidChallengeTimeout()
    //     return
    // }
    return verifiedSolution
}
