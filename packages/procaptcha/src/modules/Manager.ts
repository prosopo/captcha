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
    CaptchaResponseBody,
    CaptchaSolution,
    CaptchaWithProof,
    ProcaptchaCallbacks,
    ProcaptchaClientConfigInput,
    ProcaptchaClientConfigOutput,
    ProcaptchaConfigSchema,
    ProcaptchaState,
    ProcaptchaStateUpdateFn,
    StoredEvents,
    TCaptchaSubmitResult,
    encodeProcaptchaOutput,
} from '@prosopo/types'
import { ApiPromise } from '@polkadot/api/promise/Api'
import { BN_ZERO } from '@polkadot/util'
import { ExtensionWeb2, ExtensionWeb3 } from '@prosopo/account'
import { GovernanceStatus, Payee, RandomProvider } from '@prosopo/captcha-contract/types-returns'
import { Keyring } from '@polkadot/keyring'
import { PROVIDERS } from '../providers.js'
import { ProsopoCaptchaContract } from '@prosopo/contract'
import {
    ProsopoContractError,
    ProsopoDatasetError,
    ProsopoEnvError,
    ProsopoError,
    trimProviderUrl,
} from '@prosopo/common'
import { ProviderApi } from '@prosopo/api'
import { ReturnNumber } from '@prosopo/typechain-types/dist/src/types.js'
import { WsProvider } from '@polkadot/rpc-provider/ws'
import { ContractAbi as abiJson } from '@prosopo/captcha-contract/contract-info'
import { at, hashToHex } from '@prosopo/util'
import { buildUpdateState, getDefaultEvents } from '@prosopo/procaptcha-common'
import { randomAsHex } from '@polkadot/util-crypto/random'
import { sleep } from '../utils/utils.js'
import ProsopoCaptchaApi from './ProsopoCaptchaApi.js'
import storage from './storage.js'

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

const getNetwork = (config: ProcaptchaClientConfigOutput) => {
    const network = config.networks[config.defaultNetwork]
    if (!network) {
        throw new ProsopoEnvError('DEVELOPER.NETWORK_NOT_FOUND', {
            context: { error: `No network found for environment ${config.defaultEnvironment}` },
        })
    }
    return network
}

const getRandomActiveProvider = (): RandomProvider => {
    const randomIntBetween = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min)

    // TODO maybe add some signing of timestamp here by the current account and then pass the timestamp to the Provider
    //  to ensure that the random selection was completed within a certain timeframe

    const randomProvderObj = at(PROVIDERS, randomIntBetween(0, PROVIDERS.length - 1))
    return {
        providerAccount: randomProvderObj.address,
        provider: {
            status: GovernanceStatus.active,
            balance: new ReturnNumber(BN_ZERO),
            fee: 0,
            payee: Payee.dapp,
            url: randomProvderObj.url,
            datasetId: randomProvderObj.datasetId,
            datasetIdContent: randomProvderObj.datasetIdContent,
        },
        blockNumber: 0,
    }
}

/**
 * The state operator. This is used to mutate the state of Procaptcha during the captcha process. State updates are published via the onStateUpdate callback. This should be used by frontends, e.g. react, to maintain the state of Procaptcha across renders.
 */
export function Manager(
    configOptional: ProcaptchaClientConfigOutput,
    state: ProcaptchaState,
    onStateUpdate: ProcaptchaStateUpdateFn,
    callbacks: ProcaptchaCallbacks
) {
    const events = getDefaultEvents(onStateUpdate, state, callbacks)

    const dispatchErrorEvent = (err: unknown) => {
        const error = err instanceof Error ? err : new Error(String(err))
        events.onError(error)
    }

    // get the state update mechanism
    const updateState = buildUpdateState(state, onStateUpdate)

    /**
     * Build the config on demand, using the optional config passed in from the outside. State may override various
     * config values depending on the state of the captcha process. E.g. if the process has been started using account
     * "ABC" and then the user changes account to "DEF" via the optional config prop, the account in use will not change.
     * This is because the captcha process has already been started using account "ABC".
     * @returns the config for procaptcha
     */
    const getConfig = () => {
        const config: ProcaptchaClientConfigInput = {
            userAccountAddress: '',
            ...configOptional,
        }
        // overwrite the account in use with the one in state if it exists. Reduces likelihood of bugs where the user
        // changes account in the middle of the captcha process.
        if (state.account) {
            config.userAccountAddress = state.account.account.address
        }
        return ProcaptchaConfigSchema.parse(config)
    }

    const fallable = async (fn: () => Promise<void>) => {
        try {
            await fn()
        } catch (err) {
            console.error(err)
            // dispatch relevant error event
            dispatchErrorEvent(err)
            // hit an error, disallow user's claim to be human
            updateState({ isHuman: false, showModal: false, loading: false })
        }
    }

    /**
     * Called on start of user verification. This is when the user ticks the box to claim they are human.
     */
    const start = async () => {
        events.onOpen()
        await fallable(async () => {
            if (state.loading) {
                return
            }
            if (state.isHuman) {
                return
            }

            resetState()
            // set the loading flag to true (allow UI to show some sort of loading / pending indicator while we get the captcha process going)
            updateState({ loading: true })

            // snapshot the config into the state
            const config = getConfig()
            updateState({ dappAccount: config.account.address })

            // allow UI to catch up with the loading state
            await sleep(100)

            // check accounts / setup accounts
            const account = await loadAccount()

            // account has been found, check if account is already marked as human
            // first, ask the smart contract
            const contract = await loadContract()
            // We don't need to show CAPTCHA challenges if the user is determined as human by the contract
            const contractIsHuman = false
            // try {
            //     contractIsHuman = (
            //         await contract.query.dappOperatorIsHumanUser(account.account.address, config.solutionThreshold)
            //     ).value
            //         .unwrap()
            //         .unwrap()
            // } catch (error) {
            //     console.warn(error)
            // }

            if (contractIsHuman) {
                updateState({ isHuman: true, loading: false })
                events.onHuman(
                    encodeProcaptchaOutput({
                        [ApiParams.user]: account.account.address,
                        [ApiParams.dapp]: getDappAccount(),
                        [ApiParams.blockNumber]: getBlockNumber(),
                    })
                )
                setValidChallengeTimeout()
                return
            }

            // Check if there is a provider in local storage or get a random one from the contract
            const procaptchaStorage = storage.getProcaptchaStorage()
            let providerApi: ProviderApi
            if (procaptchaStorage.providerUrl && procaptchaStorage.blockNumber) {
                providerApi = await loadProviderApi(procaptchaStorage.providerUrl)

                // if the provider was already in storage, the user may have already solved some captchas but they have not been put on chain yet
                // so contact the provider to check if this is the case
                try {
                    const extension = getExtension(account)
                    if (!extension || !extension.signer || !extension.signer.signRaw) {
                        throw new ProsopoEnvError('ACCOUNT.NO_POLKADOT_EXTENSION')
                    }

                    const signRaw = extension.signer.signRaw
                    const { signature } = await signRaw({
                        address: account.account.address,
                        data: procaptchaStorage.blockNumber.toString(),
                        type: 'bytes',
                    })
                    const token = encodeProcaptchaOutput({
                        [ApiParams.user]: account.account.address,
                        [ApiParams.dapp]: getDappAccount(),
                        [ApiParams.blockNumber]: procaptchaStorage.blockNumber,
                    })
                    const verifyDappUserResponse = await providerApi.verifyUser(
                        token,
                        signature,
                        configOptional.captchas.image.cachedTimeout
                    )
                    if (
                        verifyDappUserResponse.verified &&
                        verifyDappUserResponse.commitmentId &&
                        verifyDappUserResponse.blockNumber
                    ) {
                        updateState({ isHuman: true, loading: false })
                        const output = {
                            [ApiParams.providerUrl]: procaptchaStorage.providerUrl,
                            [ApiParams.user]: account.account.address,
                            [ApiParams.dapp]: getDappAccount(),
                            [ApiParams.commitmentId]: hashToHex(verifyDappUserResponse.commitmentId),
                            [ApiParams.blockNumber]: verifyDappUserResponse.blockNumber,
                        }
                        events.onHuman(encodeProcaptchaOutput(output))
                        setValidChallengeTimeout()
                        return
                    }
                } catch (err) {
                    // if the provider is down, we should continue with the process of selecting a random provider
                    console.error('Error contacting provider from storage', procaptchaStorage.providerUrl)
                    // continue as if the provider was not in storage
                }
            }

            // get a random provider
            const getRandomProviderResponse = getRandomActiveProvider()
            const blockNumber = getRandomProviderResponse.blockNumber
            const providerUrl = getRandomProviderResponse.provider.url.toString()
            // get the provider api inst
            providerApi = await loadProviderApi(providerUrl)

            // get the captcha challenge and begin the challenge
            const captchaApi = await loadCaptchaApi(contract, getRandomProviderResponse, providerApi)

            const challenge = await captchaApi.getCaptchaChallenge()

            if (challenge.captchas.length <= 0) {
                throw new ProsopoDatasetError('DEVELOPER.PROVIDER_NO_CAPTCHA')
            }

            // setup timeout, taking the timeout from the individual captcha or the global default
            const timeMillis: number = challenge.captchas
                .map(
                    (captcha: CaptchaWithProof) => captcha.captcha.timeLimitMs || config.captchas.image.challengeTimeout
                )
                .reduce((a: number, b: number) => a + b)
            const timeout = setTimeout(() => {
                events.onChallengeExpired()
                // expired, disallow user's claim to be human
                updateState({ isHuman: false, showModal: false, loading: false })
            }, timeMillis)

            // update state with new challenge
            updateState({
                index: 0,
                solutions: challenge.captchas.map(() => []),
                challenge,
                showModal: true,
                timeout,
                blockNumber,
            })
        })
    }

    const submit = async () => {
        await fallable(async () => {
            // disable the time limit, user has submitted their solution in time
            clearTimeout()

            if (!state.challenge) {
                throw new ProsopoError('CAPTCHA.NO_CAPTCHA', {
                    context: { error: 'Cannot submit, no Captcha found in state' },
                })
            }

            // hide the modal, no further input required from user
            updateState({ showModal: false })

            const challenge: CaptchaResponseBody = state.challenge
            const salt = randomAsHex()

            // append solution to each captcha in the challenge
            const captchaSolution: CaptchaSolution[] = state.challenge.captchas.map(
                (captcha: CaptchaWithProof, index: number) => {
                    const solution = at(state.solutions, index)
                    return {
                        captchaId: captcha.captcha.captchaId,
                        captchaContentId: captcha.captcha.captchaContentId,
                        salt,
                        solution,
                    }
                }
            )

            const account = getAccount()
            const blockNumber = getBlockNumber()
            const signer = getExtension(account).signer

            const first = at(challenge.captchas, 0)
            if (!first.captcha.datasetId) {
                throw new ProsopoDatasetError('CAPTCHA.INVALID_CAPTCHA_ID', {
                    context: { error: 'No datasetId set for challenge' },
                })
            }

            const captchaApi = getCaptchaApi()

            // send the commitment to the provider
            const submission: TCaptchaSubmitResult = await captchaApi.submitCaptchaSolution(
                signer,
                challenge.requestHash,
                first.captcha.datasetId,
                captchaSolution,
                salt
            )

            // mark as is human if solution has been approved
            const isHuman = submission[0].verified

            if (!isHuman) {
                // user failed the captcha for some reason according to the provider
                events.onFailed()
            }

            // update the state with the result of the submission
            updateState({
                submission,
                isHuman,
                loading: false,
            })
            if (state.isHuman) {
                const providerUrl = trimProviderUrl(captchaApi.provider.provider.url.toString())
                // cache this provider for future use
                storage.setProcaptchaStorage({ ...storage.getProcaptchaStorage(), providerUrl, blockNumber })
                events.onHuman(
                    encodeProcaptchaOutput({
                        [ApiParams.providerUrl]: providerUrl,
                        [ApiParams.user]: account.account.address,
                        [ApiParams.dapp]: getDappAccount(),
                        [ApiParams.commitmentId]: hashToHex(submission[1]),
                        [ApiParams.blockNumber]: blockNumber,
                    })
                )
                setValidChallengeTimeout()
            }
        })
    }

    const cancel = async () => {
        // disable the time limit
        clearTimeout()
        // abandon the captcha process
        resetState()
        // trigger the onClose event
        events.onClose()
    }

    /**
     * (De)Select an image from the solution for the current round. If the hash is already in the solutions list, it will be removed (deselected) and if not it will be added (selected).
     * @param hash the hash of the image
     */
    const select = (hash: string) => {
        if (!state.challenge) {
            throw new ProsopoError('CAPTCHA.NO_CAPTCHA', {
                context: { error: 'Cannot select, no Captcha found in state' },
            })
        }
        if (state.index >= state.challenge.captchas.length || state.index < 0) {
            throw new ProsopoError('CAPTCHA.NO_CAPTCHA', {
                context: { error: 'Cannot select, index is out of range for this Captcha' },
            })
        }
        const index = state.index
        const solutions = state.solutions
        const solution = at(solutions, index)
        if (solution.includes(hash)) {
            // remove the hash from the solution
            solution.splice(solution.indexOf(hash), 1)
        } else {
            // add the hash to the solution
            solution.push(hash)
        }
        updateState({ solutions })
    }

    /**
     * Proceed to the next round of the challenge.
     */
    const nextRound = () => {
        if (!state.challenge) {
            throw new ProsopoError('CAPTCHA.NO_CAPTCHA', {
                context: { error: 'Cannot select, no Captcha found in state' },
            })
        }
        if (state.index + 1 >= state.challenge.captchas.length) {
            throw new ProsopoError('CAPTCHA.NO_CAPTCHA', {
                context: { error: 'Cannot select, index is out of range for this Captcha' },
            })
        }

        updateState({ index: state.index + 1 })
    }

    const loadCaptchaApi = async (
        contract: ProsopoCaptchaContract,
        provider: RandomProvider,
        providerApi: ProviderApi
    ) => {
        const config = getConfig()
        // setup the captcha api to carry out a challenge
        const captchaApi = new ProsopoCaptchaApi(
            getAccount().account.address,
            contract,
            provider,
            providerApi,
            config.web2,
            getDappAccount()
        )

        updateState({ captchaApi })

        return getCaptchaApi()
    }

    const loadProviderApi = async (providerUrl: string) => {
        const config = getConfig()
        const network = getNetwork(config)
        if (!config.account.address) {
            throw new ProsopoEnvError('GENERAL.SITE_KEY_MISSING')
        }
        return new ProviderApi(network, providerUrl, config.account.address)
    }

    const clearTimeout = () => {
        // clear the timeout
        window.clearTimeout(state.timeout)
        // then clear the timeout from the state
        updateState({ timeout: undefined })
    }

    const setValidChallengeTimeout = () => {
        const timeMillis: number = configOptional.captchas.image.solutionTimeout
        const successfullChallengeTimeout = setTimeout(() => {
            // Human state expired, disallow user's claim to be human
            updateState({ isHuman: false })

            events.onExpired()
        }, timeMillis)

        updateState({ successfullChallengeTimeout })
    }

    const resetState = () => {
        // clear timeout just in case a timer is still active (shouldn't be)
        clearTimeout()
        updateState(defaultState())
    }

    const getCaptchaApi = () => {
        if (!state.captchaApi) {
            throw new ProsopoEnvError('API.UNKNOWN', {
                context: { error: 'Captcha api not set', state },
            })
        }
        return state.captchaApi
    }

    /**
     * Load the account using address specified in config, or generate new address if not found in local storage for web2 mode.
     */
    const loadAccount = async () => {
        const config = getConfig()
        // check if account has been provided in config (doesn't matter in web2 mode)
        if (!config.web2 && !config.userAccountAddress) {
            throw new ProsopoEnvError('GENERAL.ACCOUNT_NOT_FOUND', {
                context: { error: 'Account address has not been set for web3 mode' },
            })
        }

        // check if account exists in extension
        const ext = config.web2 ? new ExtensionWeb2() : new ExtensionWeb3()
        const account = await ext.getAccount(config)
        // Store the account in local storage
        storage.setAccount(account.account.address)

        updateState({ account })

        return getAccount()
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

    const getBlockNumber = () => {
        if (!state.blockNumber) {
            throw new ProsopoContractError('CAPTCHA.INVALID_BLOCK_NO', { context: { error: 'Block number not found' } })
        }
        const blockNumber: number = state.blockNumber
        return blockNumber
    }

    const getExtension = (account?: Account) => {
        account = account || getAccount()
        if (!account.extension) {
            throw new ProsopoEnvError('ACCOUNT.NO_POLKADOT_EXTENSION', { context: { error: 'Extension not loaded' } })
        }
        return account.extension
    }

    /**
     * Load the contract instance using addresses from config.
     */
    const loadContract = async (): Promise<ProsopoCaptchaContract> => {
        const config = getConfig()
        const network = getNetwork(config)
        const api = await ApiPromise.create({
            provider: new WsProvider(network.endpoint),
            initWasm: false,
            noInitWarn: true,
        })
        // TODO create a shared keyring that's stored somewhere
        const type = 'sr25519'
        const keyring = new Keyring({ type, ss58Format: api.registry.chainSS58 })
        return new ProsopoCaptchaContract(
            api,
            JSON.parse(abiJson),
            network.contract.address,
            'prosopo',
            0,
            keyring.addFromAddress(getAccount().account.address)
        )
    }

    const exportData = async (events: StoredEvents) => {
        const procaptchaStorage = storage.getProcaptchaStorage()
        const providerUrlFromStorage = procaptchaStorage.providerUrl
        let providerApi: ProviderApi

        if (providerUrlFromStorage) {
            providerApi = await loadProviderApi(providerUrlFromStorage)
        } else {
            const contract = await loadContract()
            const getRandomProviderResponse: RandomProvider = getRandomActiveProvider()
            const providerUrl = trimProviderUrl(getRandomProviderResponse.provider.url.toString())
            providerApi = await loadProviderApi(providerUrl)
        }

        const providerUrl =
            storage.getProcaptchaStorage().providerUrl || state.captchaApi?.provider.provider.url.toString()
        if (!providerUrl) {
            return
        }

        let account = ''
        try {
            account = getAccount().account.address
        } catch (e) {
            console.error(e)
        }
        await providerApi.submitUserEvents(events, account)
    }

    return {
        start,
        cancel,
        submit,
        select,
        nextRound,
        exportData,
    }
}
