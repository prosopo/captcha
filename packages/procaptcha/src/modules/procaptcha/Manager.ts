import ExtWeb3 from './ExtWeb3'
import ExtWeb2 from './ExtWeb2'
import ProsopoContract from '../../api/ProsopoContract'
import { WsProvider } from '@polkadot/rpc-provider'

/**
 * The configuration of Procaptcha. This is passed it to Procaptcha as a prop. Values here are not updated by Procaptcha and are considered immutable from within Procaptcha.
 */
export interface ProcaptchaConfig {
    userAccountAddress: string // set to empty string for no account
    web2: boolean // set to true to use the web2 version of Procaptcha, else web3 version
    dappName: string // the name of the dapp accessing accounts (e.g. Prosopo)
    dappUrl: string // the url of the dapp
    endpoint: string // the endpoint to connect to (e.g. wss://kusama-rpc.polkadot.io/)
    prosopoContractAddress: string // the address of the Prosopo contract on the chain
    dappContractAddress: string // the address of the dapp's contract on the chain
}

/**
 * The state of Procaptcha. This is mutated as required to reflect the captcha process.
 */
export interface ProcaptchaState {
    isHuman: boolean // is the user human?
    index: number // the index of the captcha round currently being shown
    solutions: string[][] // the solutions for each captcha round
    providerUrl: string // set to empty string for no provider
    config: ProcaptchaConfig // the config / env variables for the captcha process
    contract?: ProsopoContract // the contract instance, contains api, abi, contract, etc. undefined if not set up
}

export type StateUpdateFn = (state: Partial<ProcaptchaState>) => void

export type ProcaptchaCallbacks = Partial<Events>

interface Events {
    onError: (error: Error) => void
    onAccountNotFound: (address: string) => void
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

            // check accounts / setup accounts
            await loadAccount()

            // account has been found, check if account is already marked as human
            // first, ask the smart contract
            await loadContract()

            if (!state.contract) {
                throw new Error('Contract not loaded')
            }
            const contract: ProsopoContract = state.contract

            
        } catch (err) {
            // dispatch error to error callback
            events.onError(err)
        }
    }

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

    const loadContract = async () => {
        const contract = await ProsopoContract.create(
            state.config.prosopoContractAddress,
            state.config.dappContractAddress,
            state.config.userAccountAddress,
            new WsProvider(state.config.endpoint)
        )

        updateState({ contract })
    }

    return {
        start,
    }
}
