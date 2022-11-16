import ExtWeb3 from './ExtWeb3'
import ExtWeb2 from './ExtWeb2'
import ProsopoContract from '../../api/ProsopoContract'
import { WsProvider } from '@polkadot/rpc-provider'
import storage from '../storage'
import {
    GetCaptchaResponse,
    ProposoProvider,
    ProsopoNetwork,
    ProsopoRandomProviderResponse,
    ProviderApi,
} from '@prosopo/api'
import { hexToString } from '@polkadot/util'
import ProsopoCaptchaApi from '../ProsopoCaptchaApi'

/**
 * The configuration of Procaptcha. This is passed it to Procaptcha as a prop. Values here are not updated by Procaptcha and are considered immutable from within Procaptcha.
 */
export interface ProcaptchaConfig {
    userAccountAddress: string // set to empty string for no account
    web2: boolean // set to true to use the web2 version of Procaptcha, else web3 version
    dappName: string // the name of the dapp accessing accounts (e.g. Prosopo)
    dappUrl: string // the url of the dapp
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
    provider: ProsopoRandomProviderResponse | undefined // undefined if no provider is selected
    config: ProcaptchaConfig // the config / env variables for the captcha process
    contract: ProsopoContract | undefined // the contract instance, contains api, abi, contract, etc. undefined if not set up
    providerApi: ProviderApi | undefined // the provider api instance for talking to the provider. undefined if not set up
    captchaApi: ProsopoCaptchaApi | undefined // the captcha api instance for managing captcha challenge. undefined if not set up
    challenge: GetCaptchaResponse | undefined // the captcha challenge from the provider. undefined if not set up
    showChallenge: boolean // whether to show the challenge or not
}

export const defaultState = (): Partial<ProcaptchaState> => {
    return {
        isHuman: false,
        index: -1,
        solutions: [],
        provider: undefined,
        contract: undefined,
        showChallenge: false,
        challenge: undefined,
        providerApi: undefined,
        captchaApi: undefined,
    }
}

export type StateUpdateFn = (state: Partial<ProcaptchaState>) => void

export type ProcaptchaCallbacks = Partial<Events>

interface Events {
    onError: (error: Error) => void
    onAccountNotFound: (address: string) => void
    onHuman: () => void
}

const buildUpdateState = (state: ProcaptchaState, onStateUpdate: StateUpdateFn) => {
    const updateCurrentState = (nextState: Partial<ProcaptchaState>) => {
        // mutate the current state
        for (const key in nextState) {
            state[key] = nextState[key]
        }
        // then call the update function for the frontend to do the same
        onStateUpdate(nextState)

        console.log('Procaptcha state update:', nextState, '\nResult:', state)
    }

    return updateCurrentState
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
                console.error(error)
            },
            onHuman: () => {
                console.log('onHuman event triggered')
            },
        },
        callbacks
    )

    // get the state update mechanism
    const updateState = buildUpdateState(state, onStateUpdate)

    /**
     * Called on start of user verification. This is when the user ticks the box to claim they are human.
     */
    const start = async () => {
        try {
            console.log('Starting procaptcha', state.config)
            resetState()

            // check accounts / setup accounts
            await loadAccount()

            // account has been found, check if account is already marked as human
            // first, ask the smart contract
            await loadContract()

            const contract = getContract()
            // We don't need to show CAPTCHA challenges if the user is determined as human by the contract
            const contractIsHuman = await contract.dappOperatorIsHumanUser(state.config.solutionThreshold)

            if (contractIsHuman) {
                updateState({ isHuman: true })
                events.onHuman()
                return
            }

            // Check if there is a provider in local storage or get a random one from the contract
            const providerFromStorage = storage.getProvider()
            if (providerFromStorage) {
                updateState({ provider: providerFromStorage })

                await loadProviderApi()
                const providerApi = getProviderApi()

                // if the provider was already in storage, the user may have already solved some captchas but they have not been put on chain yet
                // so contact the provider to check if this is the case
                try {
                    const verifyDappUserResponse = await providerApi.verifyDappUser(state.config.userAccountAddress)
                    if (verifyDappUserResponse.solutionApproved) {
                        updateState({ isHuman: true })
                        events.onHuman()
                        return
                    }
                } catch (err) {
                    // if the provider is down, we should continue with the process of selecting a random provider
                    console.log('Error contacting provider', providerFromStorage, err)
                }
            }

            const provider = await contract.getRandomProvider()
            // trim the provider url
            provider.provider.serviceOrigin = trimProviderUrl(provider.provider.serviceOrigin)

            // record provider
            updateState({ provider })
            storage.setProvider(provider)

            // get the provider api inst
            await loadProviderApi()
            const providerApi = await getProviderApi()
            updateState({ providerApi })

            // get the captcha challenge and begin the challenge
            const challenge: GetCaptchaResponse = await getCaptchaApi().getCaptchaChallenge()

            if (challenge.captchas.length <= 0) {
                throw new Error('No captchas returned from provider')
            }

            // update state with new challenge
            updateState({
                challenge,
                index: 0,
                showChallenge: true,
                solutions: challenge.captchas.map(() => []),
            })
        } catch (err) {
            updateState({ isHuman: false })
            // dispatch error to error callback
            events.onError(err)
        }
    }

    const submit = async () => {
        console.log('submit todo')
    }

    const cancel = async () => {
        // abandon the captcha process
        resetState()
    }

    const loadCaptchaApi = async () => {
        // setup the captcha api to carry out a challenge
        const captchaApi = new ProsopoCaptchaApi(
            state.config.userAccountAddress,
            getContract(),
            getProvider(),
            getProviderApi(),
            state.config.web2
        )

        updateState({ captchaApi })
    }

    const loadProviderApi = async () => {
        if (!state.provider?.provider.serviceOrigin) {
            throw new Error('Provider origin not set, cannot get provider api')
        }
        const providerUrl = state.provider.provider.serviceOrigin
        const providerApi = new ProviderApi(state.config.network, providerUrl)
        updateState({ providerApi })
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

    const getProvider = () => {
        if (!state.provider) {
            throw new Error('Provider not set')
        }
        return state.provider
    }

    const getProviderApi = () => {
        if (!state.providerApi) {
            throw new Error('ProviderApi not loaded')
        }
        const providerApi: ProviderApi = state.providerApi
        return providerApi
    }

    const getContract = () => {
        if (!state.contract) {
            throw new Error('Contract not loaded')
        }
        const contract: ProsopoContract = state.contract
        return contract
    }

    /**
     * Load the account using address specified in config, or generate new address if not found in local storage for web2 mode.
     */
    const loadAccount = async () => {
        // check if account has been provided in config
        if (!state.config.userAccountAddress) {
            throw new Error('Procaptcha: account address has not been set')
        }

        // check if account exists in extension
        const ext = state.config.web2 ? new ExtWeb2() : new ExtWeb3()
        let account
        try {
            account = await ext.getAccount(state.config) // todo don't pass the whole config
        } catch (err) {
            events.onAccountNotFound(state.config.userAccountAddress)
        }

        console.log('Using account:', account)
    }

    /**
     * Load the contract instance using addresses from config.
     */
    const loadContract = async () => {
        const contract = await ProsopoContract.create(
            state.config.network.prosopoContract.address,
            state.config.network.dappContract.address,
            state.config.userAccountAddress,
            new WsProvider(state.config.network.endpoint)
        )

        updateState({ contract })
    }

    return {
        start,
        cancel,
        submit,
    }
}

const trimProviderUrl = (url: string) => {
    return hexToString(url).replace(/\0/g, '')
}
