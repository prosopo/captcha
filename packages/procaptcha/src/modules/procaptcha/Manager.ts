import ExtWeb3 from './ExtWeb3'
import ExtWeb2 from './ExtWeb2'
import { InjectedAccount } from '@polkadot/extension-inject/types'
import { ProsopoNetwork } from '@prosopo/api'

/**
 * The configuration of Procaptcha. This is passed it to Procaptcha as a prop. Values here are not updated by Procaptcha and are considered immutable from within Procaptcha.
 */
export interface ProcaptchaConfig {
    address: string // set to empty string for no account
    web2: boolean // set to true to use the web2 version of Procaptcha, else web3 version
    dappName: string // the name of the dapp accessing accounts (e.g. Prosopo)
    dappUrl: string // the url of the dapp
    defaultEnvironment: string
    networks: { [key: string]: ProsopoNetwork }
}

/**
 * The state of Procaptcha. This is mutated as required to reflect the captcha process.
 */
export interface ProcaptchaState {
    // is the user human?
    isHuman: boolean
    // the index of the captcha round currently being shown
    index: number
    // the solutions for each captcha round
    solutions: string[][]
    // the url of the provider for the captcha challenge. undefined if no provider is set
    providerUrl: string // set to empty string for no provider
    // the config for Procaptcha. This is a snapshot of the config when Procaptcha was started
    config: ProcaptchaConfig
}

export type ProcaptchaStateUpdater = (state: Partial<ProcaptchaState>) => void

export interface ProcaptchaCallbacks {
    onError?: (error: Error) => void
    onAccountNotFound?: (address: string) => void
}

export type Events = Required<ProcaptchaCallbacks>

const wrapUpdateState = (state: ProcaptchaState, updateState: ProcaptchaStateUpdater, events: Events) => {
    const updateCurrentState = (nextState: Partial<ProcaptchaState>) => {
        // mutate the current state
        for (const key in nextState) {
            state[key] = nextState[key]
        }
        // then call the update function for the frontend to do the same
        updateState(nextState)

        console.log('Procaptcha state update:', nextState, '\nResult:', state)
    }

    return updateCurrentState
}

/**
 * The state operator. This provides various methods for manipulating the state. Note that the state is not stored in this class. This is the responsibility of the UI framework to manage, e.g. react's useState hook.
 */
export const Manager = (
    state: ProcaptchaState,
    updateState: ProcaptchaStateUpdater,
    callbacks: ProcaptchaCallbacks
) => {

    // default callbacks if none specified by the dapp. These get called on specific events
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

    // the state parameter is the current state of Procaptcha
    // the updateState function updates the state of Procaptcha in the frontend framework, be it react, vue, etc.
    // in this situation, the frontend is informed of updates but we do not receive them here until this function is called again
    // therefore, we need to wrap the updateState function to update the state parameter as well so we can use the new state in _this_ function call, not only the next one
    updateState = wrapUpdateState(state, updateState, events)

    /**
     * Called on start of user verification. This is when the user ticks the box to claim they are human.
     */
    const start = async (config: ProcaptchaConfig) => {
        try {
            console.log('starting procaptcha', config)

            // take a snapshot of the config and store in the state
            // this stops the config from being changed later on and causing problems
            // for the same reason, we deep copy the config so nested objects are not mutated from the outside
            updateState({ config: JSON.parse(JSON.stringify(config)) })

            // check accounts / setup accounts
            await loadAccount(config, state)

            // account has been found, check if account is already marked as human
            // first, ask the smart contract
            // const contract = await initContract(config, state)
            // updateState({ contract })

            updateState({ isHuman: true })
        } catch (err) {
            // dispatch error to error callback
            events.onError(err)
        }
    }

    const loadAccount = async (config: ProcaptchaConfig, state: ProcaptchaState) => {
        // check if account has been provided in config
        if (!config.address) {
            throw new Error('Procaptcha: account address has not been set')
        }

        // check if account exists in extension
        const ext = state.config.web2 ? new ExtWeb2() : new ExtWeb3()
        let account
        try {
            account = await ext.getAccount(config)
        } catch (err) {
            events.onAccountNotFound(state.config.address)
        }

        console.log('Using account:', account)
    }


    const loadContract = async (): Promise<never> => {
        // const defaultEnvironment = this.manager.state.config.defaultEnvironment
        // try {
        //     return await getProsopoContract(
        //         this.manager.state.config.networks[defaultEnvironment].prosopoContract.address,
        //         this.manager.state.config.networks[defaultEnvironment].dappContract.address,
        //         account,
        //         getWsProvider(this.manager.state.config.networks[defaultEnvironment].endpoint)
        //     )
        // } catch (err) {
        //     throw new ProsopoEnvError(err)
        // }
        throw new Error('unsupported')
    }

    return {
        start,
    }
}
