import {
    Account,
    ProcaptchaCallbacks,
    ProcaptchaConfig,
    ProcaptchaConfigOptional,
    ProcaptchaEvents,
    ProcaptchaState,
    ProcaptchaStateUpdateFn,
} from '../types/manager'
import { ApiPromise, Keyring } from '@polkadot/api'
import { CaptchaSolution, ContractAbi, RandomProvider } from '@prosopo/types'
import { GetCaptchaResponse, ProviderApi } from '@prosopo/api'
import { ProsopoCaptchaContract, abiJson } from '@prosopo/contract'
import { SignerPayloadRaw } from '@polkadot/types/types'
import { TCaptchaSubmitResult } from '../types/client'
import { WsProvider } from '@polkadot/rpc-provider'
import { randomAsHex } from '@polkadot/util-crypto'
import { sleep } from '../utils/utils'
import { stringToU8a } from '@polkadot/util'
import { trimProviderUrl } from '@prosopo/common'
import ExtensionWeb2 from '../api/ExtensionWeb2'
import ExtensionWeb3 from '../api/ExtensionWeb3'
import ProsopoCaptchaApi from './ProsopoCaptchaApi'
import storage from './storage'

export const defaultState = (): Partial<ProcaptchaState> => {
    return {
        // note order matters! see buildUpdateState. These fields are set in order, so disable modal first, then set loading to false, etc.
        showModal: false,
        loading: false,
        challenge: undefined,
        solutions: [],
        index: -1,
        isHuman: false,
        captchaApi: undefined,
        account: undefined,
        // don't handle timeout here, this should be handled by the state management
    }
}

const buildUpdateState = (state: ProcaptchaState, onStateUpdate: ProcaptchaStateUpdateFn) => {
    const updateCurrentState = (nextState: Partial<ProcaptchaState>) => {
        // mutate the current state. Note that this is in order of properties in the nextState object.
        // e.g. given {b: 2, c: 3, a: 1}, b will be set, then c, then a. This is because JS stores fields in insertion order by default, unless you override it with a class or such by changing the key enumeration order.
        for (const key in nextState) {
            state[key] = nextState[key]
        }
        // then call the update function for the frontend to do the same
        onStateUpdate(nextState)
    }

    return updateCurrentState
}

/**
 * The state operator. This is used to mutate the state of Procaptcha during the captcha process. State updates are published via the onStateUpdate callback. This should be used by frontends, e.g. react, to maintain the state of Procaptcha across renders.
 */
export const Manager = (
    configOptional: ProcaptchaConfigOptional,
    state: ProcaptchaState,
    onStateUpdate: ProcaptchaStateUpdateFn,
    callbacks: ProcaptchaCallbacks
) => {
    // events are emitted at various points during the captcha process. These each have default behaviours below which can be overridden by the frontend using callbacks.
    const events: ProcaptchaEvents = Object.assign(
        {
            onAccountNotFound: (address) => {
                alert(`Account ${address} not found`)
            },
            onError: (error) => {
                alert(`${error?.message ?? 'An unexpected error occurred'}, please try again`)
            },
            onHuman: (output) => {},
            onExtensionNotFound: () => {
                alert('No extension found')
            },
            onExpired: () => {
                alert('Challenge has expired, please try again')
            },
            onFailed: () => {
                alert('Captcha challenge failed. Please try again')
            },
        },
        callbacks
    )

    // mapping of type of error to relevant event callback
    const errorToEventMap = {
        AccountNotFoundError: events.onAccountNotFound,
        ExtensionNotFoundError: events.onExtensionNotFound,
        Error: events.onError,
        ExpiredError: events.onExpired,
    }

    // get the state update mechanism
    const updateState = buildUpdateState(state, onStateUpdate)

    /**
     * Build the config on demand, using the optional config passed in from the outside. State may override various config values depending on the state of the captcha process. E.g. if the process has been started using account "ABC" and then the user changes account to "DEF" via the optional config prop, the account in use will not change. This is because the captcha process has already been started using account "ABC".
     * @returns the config for procaptcha
     */
    const getConfig = () => {
        const config: ProcaptchaConfig = {
            web2: false,
            userAccountAddress: '',
            ...configOptional,
        }
        // overwrite the account in use with the one in state if it exists. Reduces likelihood of bugs where the user changes account in the middle of the captcha process.
        if (state.account) {
            config.userAccountAddress = state.account.account.address
        }
        return config
    }

    /**
     * Called on start of user verification. This is when the user ticks the box to claim they are human.
     */
    const start = async () => {
        try {
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
            updateState({ dappAccount: config.network.dappContract.address })

            // allow UI to catch up with the loading state
            await sleep(100)

            // check accounts / setup accounts
            const account = await loadAccount()

            // account has been found, check if account is already marked as human
            // first, ask the smart contract
            const contract = await loadContract()
            // We don't need to show CAPTCHA challenges if the user is determined as human by the contract
            let contractIsHuman = false
            try {
                contractIsHuman = (
                    await contract.query.dappOperatorIsHumanUser(account.account.address, config.solutionThreshold)
                ).value
                    .unwrap()
                    .unwrap()
            } catch (error) {
                console.warn(error)
            }

            if (contractIsHuman) {
                updateState({ isHuman: true, loading: false })
                events.onHuman({
                    user: account.account.address,
                    dapp: config.network.dappContract.address,
                })
                return
            }

            // Check if there is a provider in local storage or get a random one from the contract
            const providerUrlFromStorage = storage.getProviderUrl()
            let providerApi: ProviderApi
            if (providerUrlFromStorage) {
                providerApi = await loadProviderApi(providerUrlFromStorage)

                // if the provider was already in storage, the user may have already solved some captchas but they have not been put on chain yet
                // so contact the provider to check if this is the case
                try {
                    const verifyDappUserResponse = await providerApi.verifyDappUser(account.account.address)
                    if (verifyDappUserResponse.solutionApproved) {
                        updateState({ isHuman: true, loading: false })
                        events.onHuman({
                            providerUrl: providerUrlFromStorage,
                            user: account.account.address,
                            dapp: config.network.dappContract.address,
                            commitmentId: verifyDappUserResponse.commitmentId,
                        })
                        return
                    }
                } catch (err) {
                    // if the provider is down, we should continue with the process of selecting a random provider
                    console.error('Error contacting provider from storage', providerUrlFromStorage)
                    // continue as if the provider was not in storage
                }
            }
            const payload = {
                address: account.account.address,
                data: stringToU8a('message'),
                type: 'bytes',
            }
            const signed = await account.extension!.signer!.signRaw!(payload as unknown as SignerPayloadRaw)

            // get a random provider
            const getRandomProviderResponse = (
                await contract.query.getRandomActiveProvider(
                    account.account.address,
                    config.network.dappContract.address
                )
            ).value
                .unwrap()
                .unwrap()
            const blockNumber = getRandomProviderResponse.blockNumber

            const providerUrl = trimProviderUrl(getRandomProviderResponse.provider.url.toString())
            // get the provider api inst
            providerApi = await loadProviderApi(providerUrl)

            // get the captcha challenge and begin the challenge
            const captchaApi = await loadCaptchaApi(contract, getRandomProviderResponse, providerApi)

            const challenge: GetCaptchaResponse = await captchaApi.getCaptchaChallenge()

            if (challenge.captchas.length <= 0) {
                throw new Error('No captchas returned from provider')
            }

            // setup timeout
            const timeMillis: number = challenge.captchas
                .map((captcha) => captcha.captcha.timeLimitMs || 30 * 1000)
                .reduce((a, b) => a + b)
            const timeout = setTimeout(() => {
                events.onExpired()
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
        } catch (err) {
            console.error(err)
            // dispatch relevant error event
            const event = errorToEventMap[err.constructor] || events.onError
            event(err)
            // hit an error, disallow user's claim to be human
            updateState({ isHuman: false, showModal: false, loading: false })
        }
    }

    const submit = async () => {
        try {
            // disable the time limit, user has submitted their solution in time
            clearTimeout()

            if (!state.challenge) {
                throw new Error('cannot submit, no challenge found')
            }

            // hide the modal, no further input required from user
            updateState({ showModal: false })

            const challenge: GetCaptchaResponse = state.challenge
            const salt = randomAsHex()

            // append solution to each captcha in the challenge
            const captchaSolution: CaptchaSolution[] = state.challenge.captchas.map((captcha, index) => {
                const solution = state.solutions[index]
                return {
                    captchaId: captcha.captcha.captchaId,
                    captchaContentId: captcha.captcha.captchaContentId,
                    salt,
                    solution,
                }
            })

            const account = getAccount()
            const blockNumber = getBlockNumber()
            const signer = account.extension.signer

            if (!challenge.captchas[0].captcha.datasetId) {
                throw new Error('No datasetId set for challenge')
            }

            const captchaApi = getCaptchaApi()

            // send the commitment to the provider
            const submission: TCaptchaSubmitResult = await captchaApi.submitCaptchaSolution(
                signer,
                challenge.requestHash,
                challenge.captchas[0].captcha.datasetId,
                captchaSolution,
                salt
            )

            // mark as is human if solution has been approved
            const isHuman = submission[0].solutionApproved

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
                events.onHuman({
                    providerUrl: trimProviderUrl(captchaApi.provider.provider.url.toString()),
                    user: account.account.address,
                    dapp: getDappAccount(),
                    commitmentId: submission[1],
                    blockNumber,
                })
            }
        } catch (err) {
            // dispatch relevant error event
            const event = errorToEventMap[err.constructor] || events.onError
            event(err)
            // hit an error, disallow user's claim to be human
            updateState({ isHuman: false, showModal: false, loading: false })
        }
    }

    const cancel = async () => {
        // disable the time limit
        clearTimeout()
        // abandon the captcha process
        resetState()
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
        const index = state.index
        const solutions = state.solutions
        const solution = solutions[index]
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
            throw new Error('cannot proceed to next round, no challenge found')
        }
        if (state.index + 1 >= state.challenge.captchas.length) {
            throw new Error('cannot proceed to next round, already at last round')
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
            config.network.dappContract.address
        )

        updateState({ captchaApi })

        return getCaptchaApi()
    }

    const loadProviderApi = async (providerUrl: string) => {
        const config = getConfig()
        const providerApi = new ProviderApi(config.network, providerUrl)
        return providerApi
    }

    const clearTimeout = () => {
        // clear the timeout
        window.clearTimeout(state.timeout)
        // then clear the timeout from the state
        updateState({ timeout: undefined })
    }

    const resetState = () => {
        // clear timeout just in case a timer is still active (shouldn't be)
        clearTimeout()
        updateState(defaultState())
    }

    const getCaptchaApi = () => {
        if (!state.captchaApi) {
            throw new Error('Captcha api not set')
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
            throw new Error('Account address has not been set for web3 mode')
        }

        // check if account exists in extension
        const ext = config.web2 ? new ExtensionWeb2() : new ExtensionWeb3()
        const account = await ext.getAccount(config)

        updateState({ account })

        return getAccount()
    }

    const getAccount = () => {
        if (!state.account) {
            throw new Error('Account not loaded')
        }
        const account: Account = state.account
        return account
    }

    const getDappAccount = () => {
        if (!state.dappAccount) {
            throw new Error('Dapp account not loaded')
        }
        const dappAccount: string = state.dappAccount
        return dappAccount
    }

    const getBlockNumber = () => {
        if (!state.blockNumber) {
            throw new Error('Account not loaded')
        }
        const blockNumber: number = state.blockNumber
        return blockNumber
    }

    /**
     * Load the contract instance using addresses from config.
     */
    const loadContract = async (): Promise<ProsopoCaptchaContract> => {
        const config = getConfig()
        const api = await ApiPromise.create({ provider: new WsProvider(config.network.endpoint) })
        // TODO create a shared keyring that's stored somewhere
        const type = 'sr25519'
        const keyring = new Keyring({ type, ss58Format: api.registry.chainSS58 })
        return new ProsopoCaptchaContract(
            api,
            abiJson as ContractAbi,
            config.network.prosopoContract.address,
            keyring.addFromAddress(getAccount().account.address),
            'prosopo',
            0
        )
    }

    return {
        start,
        cancel,
        submit,
        select,
        nextRound,
    }
}
