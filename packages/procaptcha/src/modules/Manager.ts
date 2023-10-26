// Copyright 2021-2023 Prosopo (UK) Ltd.
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
    ProcaptchaCallbacks,
    ProcaptchaConfigOptional,
    ProcaptchaEvents,
    ProcaptchaState,
    ProcaptchaStateUpdateFn,
} from '../types/manager.js'
import { AccountNotFoundError } from '../api/errors.js'
import { ApiPromise, Keyring, WsProvider } from '@polkadot/api'
import { CaptchaSolution, ProcaptchaClientConfigOutput, ProcaptchaConfigSchema } from '@prosopo/types'
import { GetCaptchaResponse } from '../index.js'
import { Observable, from, lastValueFrom } from 'rxjs'
import { ProsopoCaptchaContract, wrapQuery } from '@prosopo/contract'
import { ProsopoEnvError, trimProviderUrl } from '@prosopo/common'
import { ProviderApi, VerificationResponse } from '@prosopo/api'
import { RandomProvider, ContractAbi as abiJson } from '@prosopo/captcha-contract'
import { at } from '@prosopo/util'
import { randomAsHex } from '@polkadot/util-crypto'
import { retry, take } from 'rxjs/operators'
import ExtensionWeb2 from '../api/ExtensionWeb2.js'
import ExtensionWeb3 from '../api/ExtensionWeb3.js'
import ProsopoCaptchaApi from './ProsopoCaptchaApi.js'
import storage from './storage.js'

export const defaultState = (): Partial<ProcaptchaState> => ({
    showModal: false,
    loading: false,
    index: 0,
    challenge: undefined,
    solutions: undefined,
    isHuman: false,
    captchaApi: undefined,
    account: undefined,
})

const buildUpdateState =
    (state: ProcaptchaState, onStateUpdate: ProcaptchaStateUpdateFn) => (nextState: Partial<ProcaptchaState>) => {
        Object.assign(state, nextState)
        onStateUpdate(nextState)
    }

export const getNetwork = (config: ProcaptchaClientConfigOutput) => {
    const network = config.networks[config.defaultNetwork]
    if (!network) {
        throw new Error(`No network found for environment ${config.defaultEnvironment}`)
    }
    return network
}

/**
 * The state operator. This is used to mutate the state of Procaptcha during the captcha process. State updates are published via the onStateUpdate callback. This should be used by frontends, e.g. react, to maintain the state of Procaptcha across renders.
 */
export function Manager(
    configOptional: ProcaptchaConfigOptional,
    state: ProcaptchaState,
    onStateUpdate: ProcaptchaStateUpdateFn,
    callbacks: ProcaptchaCallbacks
) {
    const alertError = (error: Error) => {
        console.error(error)
        alert(error.message)
    }

    const events: ProcaptchaEvents = Object.assign(
        {
            onAccountNotFound: alertError,
            onError: alertError,
            onHuman: (output: { user: string; dapp: string; commitmentId?: string; providerUrl?: string }) => {
                console.info('onHuman event triggered', output)
            },
            onExtensionNotFound: () => {
                alert('No extension found')
            },
            onFailed: () => {
                alert('Captcha challenge failed. Please try again')
            },
            onExpired: () => {
                alert('Completed challenge has expired, please try again')
            },
            onChallengeExpired: () => {
                alert('Uncompleted challenge has expired, please try again')
            },
            onOpen: () => {
                console.info('onOpen event triggered')
            },
            onClose: () => {
                console.info('onClose event triggered')
            },
        },
        callbacks
    )

    const dispatchErrorEvent = (err: unknown) => {
        const error = err instanceof Error ? err : new Error(String(err))
        if (error instanceof AccountNotFoundError) {
            events.onAccountNotFound(error.message)
        } else {
            events.onError(error)
        }
    }

    const updateState = buildUpdateState(state, onStateUpdate)

    /**
     * Build the config on demand, using the optional config passed in from the outside. State may override various
     * config values depending on the state of the captcha process. E.g. if the process has been started using account
     * "ABC" and then the user changes account to "DEF" via the optional config prop, the account in use will not change.
     * This is because the captcha process has already been started using account "ABC".
     * @returns the config for procaptcha
     */
    const getConfig = () =>
        ProcaptchaConfigSchema.parse({
            ...configOptional,
            userAccountAddress: state.account ? state.account.account.address : configOptional.userAccountAddress || '',
        })

    const fallable = async (fn: () => Promise<void>) => {
        try {
            await fn()
        } catch (err) {
            console.error(err)
            dispatchErrorEvent(err)
            updateState({ isHuman: false, showModal: false, loading: false })
        }
    }

    /**
     * Called on start of user verification. This is when the user ticks the box to claim they are human.
     */
    const start = async () => {
        events.onOpen()
        await fallable(async () => {
            if (state.loading || state.isHuman) return

            resetState()
            updateState({ dappAccount: getConfig().account.address, loading: true })

            const account = await loadAccount()
            const contract = await loadContract()

            if (await checkHumanInContract(contract, account)) {
                handleHumanInContract(account)
                return
            }

            // Check if a provider is cached in local storage
            const providerUrlFromStorage = storage.getProviderUrl()
            if (providerUrlFromStorage) {
                try {
                    // Verify cached provider is legitimate
                    const verifyDappUserResponse = await getVerifyDappUserFunction(providerUrlFromStorage, account)

                    // If legitimate cached provider, check if human in cached provider
                    if (verifyDappUserResponse.solutionApproved) {
                        handleHumanInCachedProvider(providerUrlFromStorage, account, verifyDappUserResponse)
                        return
                    }
                } catch (err) {
                    console.error('Error contacting provider from storage', providerUrlFromStorage)
                }
            }

            // If not human in contract or cached provider, get new captcha from a random provider
            const randomProviderResponse = await getRandomProviderResponse(contract, account)
            const challenge = await getChallenge(randomProviderResponse, contract)

            if (challenge.captchas.length <= 0) {
                throw new Error('No captchas returned from provider')
            }

            updateState({
                challenge,
                index: 0,
                solutions: challenge.captchas.map(() => []),
                showModal: true,
                timeout: setTimeToComplete(challenge),
                blockNumber: getBlockNumberFromProvider(randomProviderResponse),
            })
        })
    }

    /**
     * Submit the captcha solution.
     */
    const submit = async () => {
        await fallable(async () => {
            clearTimeout()
            updateState({ showModal: false })

            if (!state.challenge) {
                throw new Error('cannot submit, no challenge found')
            }
            if (!at(state.challenge.captchas, 0).captcha.datasetId) {
                throw new Error('No datasetId set for challenge')
            }

            // Build the captcha solution
            const salt = randomAsHex()
            const submission = await getCaptchaApi().submitCaptchaSolution(
                getAccount().extension.signer,
                state.challenge.requestHash,
                getSolutionsFromState(salt),
                salt
            )

            const isHuman = submission[0].solutionApproved

            if (!isHuman) {
                events.onFailed()
            }

            updateState({
                submission,
                isHuman,
                loading: false,
            })

            if (isHuman) {
                const trimmedUrl = trimProviderUrl(getCaptchaApi().provider.provider.url.toString())
                storage.setProviderUrl(trimmedUrl)

                events.onHuman({
                    providerUrl: trimmedUrl,
                    user: getAccount().account.address,
                    dapp: getDappAccount(),
                    commitmentId: submission[1],
                    blockNumber: getBlockNumberFromState(),
                })
                setValidChallengeTimeout()
            }
        })
    }

    /**
     * (De)Select an image from the solution for the current round. If the hash is already in the solutions list, it will be removed (deselected) and if not it will be added (selected).
     * @param hash the hash of the image
     */
    const select = (hash: string) => {
        if (!state.challenge) {
            throw new Error('cannot select, no challenge found')
        }
        if (state.index >= state.challenge.captchas.length || state.index < 0) {
            throw new Error('cannot select, round index out of range')
        }

        const solution = at(state.solutions, state.index)
        handleIsSelected(solution, hash)

        updateState({ solutions: state.solutions })
    }

    /**
     * Proceed to the next round of the challenge.
     */
    const nextRound = () => {
        if (!state.challenge) {
            throw new Error('cannot proceed to next round, no challenge found')
        }
        if (state.index + 1 >= state.challenge.captchas.length) {
            throw new Error('cannot proceed to next round, already at last round')
        }
        updateState({ index: state.index + 1 })
    }

    /**
     * Load the captcha api using the contract and provider.
     * @param contract the contract instance
     * @param provider the provider instance
     * @param providerApi the provider api instance
     */
    const loadCaptchaApi = async (
        contract: ProsopoCaptchaContract,
        provider: RandomProvider,
        providerApi: ProviderApi
    ) => {
        updateState({
            captchaApi: new ProsopoCaptchaApi(
                getAccount().account.address,
                contract,
                provider,
                providerApi,
                getConfig().web2,
                getDappAccount()
            ),
        })
        return getCaptchaApi()
    }

    /**
     * Create an observable that emits on every new block.
     * Used for retrying random provider requests.
     */
    const createBlockObservable = () =>
        new Observable(
            (subscriber) => () =>
                ApiPromise.create({ provider: new WsProvider(getNetwork(getConfig()).endpoint) })
                    .then((api) => {
                        api.rpc.chain.subscribeNewHeads((header) => {
                            subscriber.next(header)
                        })
                    })
                    .catch((error) => {
                        subscriber.error(error)
                    })
        )

    /**
     * Load the account using address specified in config, or generate new address if not found in local storage for web2 mode.
     */
    const loadAccount = async () => {
        const config = getConfig()
        if (!config.web2 && !config.userAccountAddress) {
            throw new Error('Account address has not been set for web3 mode')
        }
        const ext = config.web2 ? new ExtensionWeb2() : new ExtensionWeb3()
        const account = await ext.getAccount(config)
        storage.setAccount(account.account.address)
        updateState({ account })
        return getAccount()
    }

    /**
     * Load the provider api
     * @param providerUrl
     */
    const loadProviderApi = async (providerUrl: string) => {
        const config = getConfig()
        if (!config.account.address) {
            throw new ProsopoEnvError('GENERAL.SITE_KEY_MISSING')
        }
        return new ProviderApi(getNetwork(config), providerUrl, config.account.address)
    }

    /**
     * Load the contract instance using addresses from config.
     */
    const loadContract = async (): Promise<ProsopoCaptchaContract> => {
        const network = getNetwork(getConfig())
        const api = await ApiPromise.create({ provider: new WsProvider(network.endpoint) })
        const type = 'sr25519'
        return new ProsopoCaptchaContract(
            api,
            JSON.parse(abiJson),
            network.contract.address,
            'prosopo',
            0,
            new Keyring({ type, ss58Format: api.registry.chainSS58 }).addFromAddress(getAccount().account.address)
        )
    }

    /**
     * Handles whether clicking on an image should select or deselect it.
     * @param solution
     * @param hash
     */
    function handleIsSelected(solution: string[], hash: string) {
        if (solution.includes(hash)) {
            solution.splice(solution.indexOf(hash), 1)
        } else {
            solution.push(hash)
        }
    }

    /**
     * Get the solutions from the state, with the salt added.
     * @param salt
     * @returns
     */
    function getSolutionsFromState(salt: string): CaptchaSolution[] {
        if (!state.challenge) {
            throw new Error('cannot get solutions, no challenge found')
        }
        return state.challenge.captchas.map((captcha, index) => ({
            captchaId: captcha.captcha.captchaId,
            captchaContentId: captcha.captcha.captchaContentId,
            salt,
            solution: at(state.solutions, index),
        }))
    }

    /**
     * Handle the case where the user is human and the provider is cached in local storage
     * @param providerUrlFromStorage
     * @param account
     * @param verifyDappUserResponse
     */
    function handleHumanInCachedProvider(
        providerUrlFromStorage: string,
        account: Account,
        verifyDappUserResponse: VerificationResponse
    ) {
        updateState({ isHuman: true, loading: false })
        events.onHuman({
            providerUrl: providerUrlFromStorage,
            user: account.account.address,
            dapp: getDappAccount(),
            commitmentId: verifyDappUserResponse.commitmentId,
        })
        setValidChallengeTimeout()
    }

    /**
     * Get the verifyDappUser function from the provider api
     * @param providerUrlFromStorage
     * @param account
     * @returns
     */
    function getVerifyDappUserFunction(providerUrlFromStorage: string, account: Account) {
        return loadProviderApi(providerUrlFromStorage).then((providerApi) =>
            providerApi.verifyDappUser(account.account.address)
        )
    }

    /**
     * Handle the case where the user is human and the provider is cached in the contract
     * @param account
     */
    function handleHumanInContract(account: Account) {
        updateState({ isHuman: true, loading: false })
        events.onHuman({
            user: account.account.address,
            dapp: getDappAccount(),
        })
        setValidChallengeTimeout()
    }

    /**
     * Check if the user is human in the contract
     * @param contract
     * @param account
     * @returns
     */
    async function checkHumanInContract(contract: ProsopoCaptchaContract, account: Account) {
        try {
            return contract.query
                .dappOperatorIsHumanUser(account.account.address, getConfig().solutionThreshold)
                .then((res) => res.value.unwrap().unwrap())
        } catch (err) {
            console.error(err)
            return false
        }
    }

    /**
     * Get the captcha challenge from the provider api
     * @param getRandomProviderResponse
     * @param contract
     * @returns
     */
    function getChallenge(getRandomProviderResponse: RandomProvider, contract: ProsopoCaptchaContract) {
        return loadProviderApi(trimProviderUrl(getRandomProviderResponse.provider.url.toString()))
            .then((api) => loadCaptchaApi(contract, getRandomProviderResponse, api))
            .then((captchaApi) => captchaApi.getCaptchaChallenge())
    }

    /**
     * Get a random provider from the contract
     * Uses retry to handle the case where the provider is not available on the first attempt
     * Waits for block rollover to ensure new provider selected
     * Returns promise
     *
     * @param contract
     * @param account
     * @returns
     */
    function getRandomProviderResponse(contract: ProsopoCaptchaContract, account: Account) {
        return lastValueFrom(
            from<Promise<RandomProvider>>(
                wrapQuery(contract.query.getRandomActiveProvider, contract.query)(
                    account.account.address,
                    getDappAccount()
                )
            ).pipe(
                retry({
                    count: 3,
                    delay: (error, retryCount) => {
                        console.error(`Attempt ${retryCount} failed. Retrying on next block. Error: ${error}`)
                        return createBlockObservable().pipe(take(1))
                    },
                    resetOnSuccess: true,
                })
            )
        )
    }

    /**
     * Verify the captcha data
     * @param challenge
     * @returns
     */
    function setTimeToComplete(challenge: GetCaptchaResponse): NodeJS.Timeout | undefined {
        return setTimeout(
            () => {
                events.onChallengeExpired()
                updateState({ isHuman: false, showModal: false, loading: false })
            },
            challenge.captchas.map((captcha) => captcha.captcha.timeLimitMs || 30 * 1000).reduce((a, b) => a + b)
        )
    }

    /**
     * The timeout for the challenge to be completed
     * Defaults to 2 minutes
     * @returns
     */
    const setValidChallengeTimeout = () => {
        updateState({
            successfullChallengeTimeout: setTimeout(
                () => {
                    updateState({ isHuman: false })
                    events.onExpired()
                },
                configOptional.challengeValidLength || 120 * 1000
            ),
        })
    }

    const cancel = async () => {
        clearTimeout()
        resetState()
        events.onClose()
    }

    const clearTimeout = () => {
        window.clearTimeout(state.timeout)
        updateState({ timeout: undefined })
    }

    const resetState = () => {
        clearTimeout()
        updateState(defaultState())
    }

    const getCaptchaApi = () => {
        if (!state.captchaApi) {
            throw new Error('Captcha api not set')
        }
        return state.captchaApi
    }

    const getAccount = () => {
        if (!state.account) {
            throw new Error('Account not loaded')
        }
        return state.account
    }

    const getDappAccount = () => {
        if (!state.dappAccount) {
            throw new ProsopoEnvError('GENERAL.SITE_KEY_MISSING')
        }
        return state.dappAccount
    }

    const getBlockNumberFromState = () => {
        if (!state.blockNumber) {
            throw new Error('Account not loaded')
        }
        return state.blockNumber
    }

    function getBlockNumberFromProvider(getRandomProviderResponse: RandomProvider): number | undefined {
        return parseInt(getRandomProviderResponse.blockNumber.toString())
    }

    return {
        start,
        cancel,
        submit,
        select,
        nextRound,
    }
}
