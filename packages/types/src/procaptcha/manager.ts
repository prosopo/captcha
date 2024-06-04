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
import { ApiParams, CaptchaResponseBody } from '../provider/index.js'
import { HexString } from '@polkadot/util/types'
import { InjectedAccount, InjectedExtension } from '@polkadot/extension-inject/types'
import { Option, Struct, str, u32 } from 'scale-ts'
import { ProsopoCaptchaApiInterface } from './api.js'
import { TCaptchaSubmitResult } from './client.js'
import { literal, number, object, string, infer as zInfer } from 'zod'
/**
 * House the account and associated extension.
 */
export interface Account {
    account: InjectedAccount
    extension?: InjectedExtension
}

export const ProcaptchaOutputSchema = object({
    [ApiParams.commitmentId]: string().optional(),
    [ApiParams.providerUrl]: string().optional(),
    [ApiParams.dapp]: string(),
    [ApiParams.user]: string(),
    [ApiParams.blockNumber]: number().optional(),
    [ApiParams.challenge]: string().optional(),
})

/**
 * The information produced by procaptcha on completion of the captcha process,
 * whether verified by smart contract, a pending commitment in the cache of a
 * provider or a captcha challenge.
 */
export type ProcaptchaOutput = zInfer<typeof ProcaptchaOutputSchema>

export const ProcaptchaTokenCodec = Struct({
    commitmentId: Option(str),
    providerUrl: Option(str),
    dapp: str,
    user: str,
    blockNumber: Option(u32),
    challenge: Option(str),
})

export type ProcaptchaToken = HexString

export const ProcaptchaResponse = object({
    [ApiParams.procaptchaResponse]: literal(`0x${string()}`),
})

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
    onHuman: (output: ProcaptchaToken) => void
    onExtensionNotFound: () => void
    onChallengeExpired: () => void
    onExpired: () => void
    onFailed: () => void
    onOpen: () => void
    onClose: () => void
}

/**
 * The state of Procaptcha. This is mutated as required to reflect the captcha
 * process.
 */
export interface ProcaptchaState {
    isHuman: boolean // is the user human?
    index: number // the index of the captcha round currently being shown
    solutions: string[][] // the solutions for each captcha round
    captchaApi: ProsopoCaptchaApiInterface | undefined // the captcha api instance for managing captcha challenge. undefined if not set up
    challenge: CaptchaResponseBody | undefined // the captcha challenge from the provider. undefined if not set up
    showModal: boolean // whether to show the modal or not
    loading: boolean // whether the captcha is loading or not
    account: Account | undefined // the account operating the challenge. undefined if not set
    dappAccount: string | undefined // the account of the dapp. undefined if not set (soon to be siteKey)
    submission: TCaptchaSubmitResult | undefined // the result of the captcha submission. undefined if not submitted
    timeout: NodeJS.Timeout | undefined // the timer for the captcha challenge. undefined if not set
    successfullChallengeTimeout: NodeJS.Timeout | undefined // the timer for the captcha challenge. undefined if not set
    blockNumber: number | undefined // the block number in which the random provider was chosen. undefined if not set
    sendData: boolean // whether to trigger sending user event data (mouse, keyboard, touch) to the provider
}

/**
 * Function to update the state of the Procaptcha component. This is a partial
 * state which is coalesced with the existing state, replacing any fields that
 * are defined and using values from the current state for any undefined state
 * variables.
 */
export type ProcaptchaStateUpdateFn = (state: Partial<ProcaptchaState>) => void
