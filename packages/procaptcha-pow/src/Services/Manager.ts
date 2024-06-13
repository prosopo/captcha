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
import {
    Account,
    ApiParams,
    ProcaptchaCallbacks,
    ProcaptchaClientConfigInput,
    ProcaptchaClientConfigOutput,
    ProcaptchaConfigSchema,
    ProcaptchaState,
    ProcaptchaStateUpdateFn,
    encodeProcaptchaOutput,
} from '@prosopo/types'
import { ApiPromise } from '@polkadot/api/promise/Api'
import { ExtensionWeb2 } from '@prosopo/account'
import { Keyring } from '@polkadot/keyring'
import { ProsopoCaptchaContract, wrapQuery } from '@prosopo/contract'
import { ProsopoEnvError, trimProviderUrl } from '@prosopo/common'
import { ProviderApi } from '@prosopo/api'
import { RandomProvider } from '@prosopo/captcha-contract/types-returns'
import { WsProvider } from '@polkadot/rpc-provider/ws'
import { ContractAbi as abiJson } from '@prosopo/captcha-contract/contract-info'
import { buildUpdateState, getDefaultEvents } from '@prosopo/procaptcha-common'
import { sleep } from '@prosopo/procaptcha'
import { solvePoW } from '@prosopo/util'

export const Manager = (
    configInput: ProcaptchaClientConfigInput,
    state: ProcaptchaState,
    onStateUpdate: ProcaptchaStateUpdateFn,
    callbacks: ProcaptchaCallbacks
) => {
    const events = getDefaultEvents(onStateUpdate, state, callbacks)

    const defaultState = (): Partial<ProcaptchaState> => {
        return {
            // note order matters! see buildUpdateState. These fields are set in order, so disable modal first, then set loading to false, etc.
            showModal: false,
            loading: false,
            index: 0,
            challenge: undefined,
            solutions: undefined,
            isHuman: false,
            captchaApi: undefined,
            account: undefined,
            // don't handle timeout here, this should be handled by the state management
        }
    }

    const clearTimeout = () => {
        // clear the timeout
        window.clearTimeout(state.timeout)
        // then clear the timeout from the state
        updateState({ timeout: undefined })
    }

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
        const api = await ApiPromise.create({
            provider: new WsProvider(network.endpoint),
            initWasm: false,
            noInitWarn: true,
        })
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

    const getAccount = () => {
        if (!state.account) {
            throw new ProsopoEnvError('GENERAL.ACCOUNT_NOT_FOUND', { context: { error: 'Account not loaded' } })
        }
        const account: Account = state.account
        return account
    }

    const getDappAccount = () => {
        if (!state.dappAccount) {
            throw new ProsopoEnvError('GENERAL.SITE_KEY_MISSING')
        }

        const dappAccount: string = state.dappAccount
        return dappAccount
    }

    // get the state update mechanism
    const updateState = buildUpdateState(state, onStateUpdate)

    const resetState = () => {
        // clear timeout just in case a timer is still active (shouldn't be)
        clearTimeout()
        updateState(defaultState())
    }

    const setValidChallengeTimeout = () => {
        const timeMillis: number = getConfig().captchas.pow.solutionTimeout
        const successfullChallengeTimeout = setTimeout(() => {
            // Human state expired, disallow user's claim to be human
            updateState({ isHuman: false })

            events.onExpired()
        }, timeMillis)

        updateState({ successfullChallengeTimeout })
    }

    const start = async () => {
        if (state.loading) {
            return
        }
        if (state.isHuman) {
            return
        }

        resetState()

        // set the loading flag to true (allow UI to show some sort of loading / pending indicator while we get the captcha process going)
        updateState({
            loading: true,
        })

        const config = getConfig()

        // check if account exists in extension
        const ext = new ExtensionWeb2()

        // use the passed in account (could be web3) or create a new account
        const userAccount = config.userAccountAddress || (await ext.getAccount(config)).account.address

        // set the account created or injected by the extension
        updateState({
            account: { account: { address: userAccount } },
        })

        // snapshot the config into the state
        updateState({ dappAccount: config.account.address })

        // allow UI to catch up with the loading state
        await sleep(100)

        // check if account has been provided in config (doesn't matter in web2 mode)
        if (!config.web2 && !config.userAccountAddress) {
            throw new ProsopoEnvError('GENERAL.ACCOUNT_NOT_FOUND', {
                context: { error: 'Account address has not been set for web3 mode' },
            })
        }

        const contract = await loadContract()

        const events = getDefaultEvents(onStateUpdate, state, callbacks)

        // get a random provider
        const getRandomProviderResponse: RandomProvider = await wrapQuery(
            contract.query.getRandomActiveProvider,
            contract.query
        )(userAccount, getDappAccount())

        const providerUrl = trimProviderUrl(getRandomProviderResponse.provider.url.toString())

        const providerApi = new ProviderApi(getNetwork(getConfig()), providerUrl, getDappAccount())

        const challenge = await providerApi.getPowCaptchaChallenge(userAccount, getDappAccount())

        const solution = solvePoW(challenge.challenge, challenge.difficulty)
        const verifiedSolution = await providerApi.submitPowCaptchaSolution(
            challenge,
            getAccount().account.address,
            getDappAccount(),
            getRandomProviderResponse,
            solution,
            config.captchas.pow.verifiedTimeout
        )
        if (verifiedSolution[ApiParams.verified]) {
            updateState({
                isHuman: true,
                loading: false,
            })
            events.onHuman(
                encodeProcaptchaOutput({
                    [ApiParams.providerUrl]: providerUrl,
                    [ApiParams.user]: getAccount().account.address,
                    [ApiParams.dapp]: getDappAccount(),
                    [ApiParams.challenge]: challenge.challenge,
                    [ApiParams.blockNumber]: getRandomProviderResponse.blockNumber,
                    [ApiParams.nonce]: solution,
                })
            )
            setValidChallengeTimeout()
        }
    }

    return {
        start,
        resetState,
    }
}
