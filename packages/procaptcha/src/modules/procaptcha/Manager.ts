import ExtWeb3 from './ExtWeb3'
import ExtWeb2 from './ExtWeb2'
import ProsopoContract from '../../api/ProsopoContract'
import { WsProvider } from '@polkadot/rpc-provider'
import storage from '../storage'
import { GetCaptchaResponse, ProsopoNetwork, ProsopoRandomProviderResponse, ProviderApi } from '@prosopo/api'
import { hexToString } from '@polkadot/util'
import ProsopoCaptchaApi from '../ProsopoCaptchaApi'
import { InjectedAccount, InjectedExtension } from '@polkadot/extension-inject/types'
import { CaptchaSolution, convertCaptchaToCaptchaSolution } from '@prosopo/datasets'
import { TCaptchaSubmitResult } from '../../types'

/**
 * House the account and associated extension.
 */
export interface Account {
    account: InjectedAccount
    extension: InjectedExtension
}

/**
 * The configuration of Procaptcha. This is passed it to Procaptcha as a prop. Values here are not updated by Procaptcha and are considered immutable from within Procaptcha.
 */
export interface ProcaptchaConfig {
    userAccountAddress: string // address of the user's account, undefined if not set / in web2 mode
    web2: boolean // set to true to use the web2 version of Procaptcha, else web3 version
    dappName: string // the name of the dapp accessing accounts (e.g. Prosopo)
    network: ProsopoNetwork // the network to use, e.g. "moonbeam", "edgeware", etc
    solutionThreshold: number // the threshold of solutions solved by the user to be considered human
}

/**
 * The state of Procaptcha. This is mutated as required to reflect the captcha process.
 */
export interface ProcaptchaState {
    isHuman: boolean // is the user human?
    index: number // the index of the captcha round currently being shown
    solutions: string[][] // the solutions for each captcha round
    config: ProcaptchaConfig // the config / env variables for the captcha process
    captchaApi: ProsopoCaptchaApi | undefined // the captcha api instance for managing captcha challenge. undefined if not set up
    challenge: GetCaptchaResponse | undefined // the captcha challenge from the provider. undefined if not set up
    showModal: boolean // whether to show the modal or not
    loading: boolean // whether the captcha is loading or not
    account: Account | undefined // the account operating the challenge. undefined if not set
    submission: TCaptchaSubmitResult | undefined // the result of the captcha submission. undefined if not submitted
}

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
    }
}

export type StateUpdateFn = (state: Partial<ProcaptchaState>) => void

export type ProcaptchaCallbacks = Partial<Events>

interface Events {
    onError: (error: Error) => void
    onAccountNotFound: (address: string) => void
    onHuman: () => void
    onExtensionNotFound: () => void
}

const buildUpdateState = (state: ProcaptchaState, onStateUpdate: StateUpdateFn) => {
    const updateCurrentState = (nextState: Partial<ProcaptchaState>) => {
        // mutate the current state. Note that this is in order of properties in the nextState object.
        // e.g. given {b: 2, c: 3, a: 1}, b will be set, then c, then a. This is because JS stores fields in insertion order by default, unless you override it with a class or such by changing the key enumeration order.
        for (const key in nextState) {
            state[key] = nextState[key]
        }
        // then call the update function for the frontend to do the same
        onStateUpdate(nextState)

        console.log('Procaptcha state update:', nextState, '\nResult:', state)
    }

    return updateCurrentState
}

const sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * The state operator. This is used to mutate the state of Procaptcha during the captcha process. State updates are published via the onStateUpdate callback. This should be used by frontends, e.g. react, to maintain the state of Procaptcha across renders.
 */
export const Manager = (state: ProcaptchaState, onStateUpdate: StateUpdateFn, callbacks: ProcaptchaCallbacks) => {
    // events are emitted at various points during the captcha process. These each have default behaviours below which can be overridden by the frontend using callbacks.
    const events: Events = Object.assign(
        {
            onAccountNotFound: (address) => {
                alert(`Account ${address} not found`)
            },
            onError: (error) => {
                alert(error ? error.message : 'An error occurred')
            },
            onHuman: () => {
                console.log('onHuman event triggered')
            },
            onExtensionNotFound: () => {
                alert('No extension found')
            },
        },
        callbacks
    )

    // mapping of type of error to relevant event callback
    const errorToEventMap = {
        AccountNotFoundError: events.onAccountNotFound,
        ExtensionNotFoundError: events.onExtensionNotFound,
        Error: events.onError,
    }

    // get the state update mechanism
    const updateState = buildUpdateState(state, onStateUpdate)

    /**
     * Called on start of user verification. This is when the user ticks the box to claim they are human.
     */
    const start = async () => {
        try {
            if (state.loading) {
                console.log('Procaptcha already loading')
                return
            }
            if (state.isHuman) {
                console.log('already human')
                return
            }

            console.log('Starting procaptcha using config:', state.config)
            resetState()
            // set the loading flag to true (allow UI to show some sort of loading / pending indicator while we get the captcha process going)
            updateState({ loading: true })

            // allow UI to catch up with the loading state
            await sleep(100)

            // check accounts / setup accounts
            const account = await loadAccount()

            // account has been found, check if account is already marked as human
            // first, ask the smart contract
            const contract = await loadContract()
            // We don't need to show CAPTCHA challenges if the user is determined as human by the contract
            const contractIsHuman = await contract.dappOperatorIsHumanUser(state.config.solutionThreshold)

            if (contractIsHuman) {
                updateState({ isHuman: true, loading: false })
                events.onHuman()
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
                        events.onHuman()
                        return
                    }
                } catch (err) {
                    // if the provider is down, we should continue with the process of selecting a random provider
                    console.error('Error contacting provider from storage', providerUrlFromStorage)
                    // continue as if the provider was not in storage
                }
            }

            // get a random provider
            const provider = await loadRandomProvider(contract)
            console.log('provider', provider)
            const providerUrl = provider.provider.serviceOrigin
            // get the provider api inst
            providerApi = await loadProviderApi(providerUrl)
            console.log('providerApi', providerApi)
            // get the captcha challenge and begin the challenge
            const captchaApi = await loadCaptchaApi(contract, provider, providerApi)
            console.log('captchaApi', captchaApi)
            const challenge: GetCaptchaResponse = await captchaApi.getCaptchaChallenge()

            if (challenge.captchas.length <= 0) {
                throw new Error('No captchas returned from provider')
            }

            // update state with new challenge
            updateState({
                index: 0,
                solutions: challenge.captchas.map(() => []),
                challenge,
                showModal: true,
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

    const loadRandomProvider = async (contract: ProsopoContract) => {
        const provider: ProsopoRandomProviderResponse = await contract.getRandomProvider()
        console.log('Got random provider', provider)
        if (!provider || !provider.provider || !provider.provider.serviceOrigin) {
            throw new Error('No provider found: ' + JSON.stringify(provider))
        }
        provider.provider.serviceOrigin = trimProviderUrl(provider.provider.serviceOrigin)
        // record provider in localstorage for subsequent human checks (i.e. if the user has already solved some captchas but they have not been put on chain yet, contact the provider in the local storage to verify)
        storage.setProviderUrl(provider.provider.serviceOrigin)
        return provider
    }

    const submit = async () => {
        try {
            console.log('submitting solutions')
            if (!state.challenge) {
                throw new Error('cannot submit, no challenge found')
            }

            // hide the modal, no further input required from user
            updateState({ showModal: false })

            const challenge: GetCaptchaResponse = state.challenge

            // append solution to each captcha in the challenge
            const captchaSolution: CaptchaSolution[] = state.challenge.captchas.map((captcha, index) => {
                const solution = state.solutions[index]
                return convertCaptchaToCaptchaSolution({ ...captcha.captcha, solution })
            })

            const account = getAccount()
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
                captchaSolution
            )

            // update the state with the result of the submission
            updateState({
                submission,
                // mark as is human if solution has been approved
                isHuman: submission[0].solutionApproved,
                loading: false,
            })
            if (state.isHuman) {
                events.onHuman()
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
        console.log('cancel')
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
            console.log('deselecting', hash)
            // remove the hash from the solution
            solution.splice(solution.indexOf(hash), 1)
        } else {
            console.log('selecting', hash)
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
        console.log('proceeding to next round')
        updateState({ index: state.index + 1 })
    }

    const loadCaptchaApi = async (
        contract: ProsopoContract,
        provider: ProsopoRandomProviderResponse,
        providerApi: ProviderApi
    ) => {
        // setup the captcha api to carry out a challenge
        const captchaApi = new ProsopoCaptchaApi(
            getAccount().account.address,
            contract,
            provider,
            providerApi,
            state.config.web2
        )

        updateState({ captchaApi })

        return getCaptchaApi()
    }

    const loadProviderApi = async (providerUrl: string) => {
        const providerApi = new ProviderApi(state.config.network, providerUrl)
        return providerApi
    }

    const resetState = () => {
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
        // check if account has been provided in config (doesn't matter in web2 mode)
        if (!state.config.web2 && !state.config.userAccountAddress) {
            throw new Error('Account address has not been set for web3 mode')
        }

        // check if account exists in extension
        const ext = state.config.web2 ? new ExtWeb2() : new ExtWeb3()
        const account = await ext.getAccount(state.config)

        console.log('Using account:', account)
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

    /**
     * Load the contract instance using addresses from config.
     */
    const loadContract = async () => {
        const contract = await ProsopoContract.create(
            state.config.network.prosopoContract.address,
            state.config.network.dappContract.address,
            getAccount().account.address,
            new WsProvider(state.config.network.endpoint)
        )

        return contract
    }

    return {
        start,
        cancel,
        submit,
        select,
        nextRound,
    }
}

const trimProviderUrl = (url: string) => {
    return hexToString(url).replace(/\0/g, '')
}
