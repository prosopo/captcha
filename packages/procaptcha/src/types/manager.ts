import { InjectedAccount, InjectedExtension } from '@polkadot/extension-inject/types'
import { GetCaptchaResponse } from '@prosopo/api'
import { TCaptchaSubmitResult } from './client'
import { ProsopoNetwork } from '@prosopo/api'
import { Optional } from './utils'
import { ProsopoCaptchaApi } from '../modules/ProsopoCaptchaApi'

/**
 * House the account and associated extension.
 */
export interface Account {
    account: InjectedAccount
    extension: InjectedExtension
}

/**
 * The configuration of Procaptcha. This is passed it to Procaptcha as a prop.
 * Values here are not updated by Procaptcha and are considered immutable from
 * within Procaptcha.
 */
export interface ProcaptchaConfig {
    userAccountAddress: string // address of the user's account, undefined if not set / in web2 mode
    web2: boolean // set to true to use the web2 version of Procaptcha, else web3 version
    dappName: string // the name of the dapp accessing accounts (e.g. Prosopo)
    network: ProsopoNetwork // the network to use, e.g. "moonbeam", "edgeware", etc
    solutionThreshold: number // the threshold of solutions solved by the user to be considered human
}

/**
 * The config to be passed to procaptcha. Some fields can be optional, e.g.
 * userAccountAddress and web2, depending on the mode of Procaptcha (web2 or web3).
 */
export type ProcaptchaConfigOptional = Optional<Optional<ProcaptchaConfig, 'userAccountAddress'>, 'web2'>

/**
 * The state of Procaptcha. This is mutated as required to reflect the captcha
 * process.
 */
export interface ProcaptchaState {
    isHuman: boolean // is the user human?
    index: number // the index of the captcha round currently being shown
    solutions: string[][] // the solutions for each captcha round
    captchaApi: ProsopoCaptchaApi | undefined // the captcha api instance for managing captcha challenge. undefined if not set up
    challenge: GetCaptchaResponse | undefined // the captcha challenge from the provider. undefined if not set up
    showModal: boolean // whether to show the modal or not
    loading: boolean // whether the captcha is loading or not
    account: Account | undefined // the account operating the challenge. undefined if not set
    dappAccount: string | undefined // the account of the dapp. undefined if not set (soon to be siteKey)
    submission: TCaptchaSubmitResult | undefined // the result of the captcha submission. undefined if not submitted
    timeout: NodeJS.Timeout | undefined // the timer for the captcha challenge. undefined if not set
    blockNumber: number | undefined // the block number in which the random provider was chosen. undefined if not set
}

/**
 * Function to update the state of the Procaptcha component. This is a partial
 * state which is coalesced with the existing state, replacing any fields that
 * are defined and using values from the current state for any undefined state
 * variables.
 */
export type ProcaptchaStateUpdateFn = (state: Partial<ProcaptchaState>) => void

/**
 * A set of callbacks called by Procaptcha on certain events. These are optional
 * as the client can decide which events they wish to listen for.
 */
export type ProcaptchaCallbacks = Partial<ProcaptchaEvents>

/**
 * A list of all events which can occur during the Procaptcha process.
 */
export interface ProcaptchaEvents {
    onError: (error: Error) => void
    onAccountNotFound: (address: string) => void
    onHuman: (output: ProcaptchaOutput) => void
    onExtensionNotFound: () => void
    onExpired: () => void
}

/**
 * The information produced by procaptcha on completion of the captcha process,
 * whether verified by smart contract, a pending commitment in the cache of a
 * provider or a captcha challenge.
 */
export interface ProcaptchaOutput {
    commitmentId?: string
    providerUrl?: string
    dappAccount: string
    userAccountAddress: string
    blockNumber?: number
}
