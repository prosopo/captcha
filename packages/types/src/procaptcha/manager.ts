import type {
    InjectedAccount,
    InjectedExtension,
} from '@polkadot/extension-inject/types'
import { number, object, string, type infer as zInfer } from 'zod'
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
import { ApiParams } from '../provider/index.js'

/**
 * House the account and associated extension.
 */
export interface Account {
    account: InjectedAccount
    extension: InjectedExtension
}

export const ProcaptchaOutputSchema = object({
    [ApiParams.commitmentId]: string().optional(),
    [ApiParams.providerUrl]: string().optional(),
    [ApiParams.dapp]: string(),
    [ApiParams.user]: string(),
    [ApiParams.blockNumber]: number().optional(),
})

/**
 * The information produced by procaptcha on completion of the captcha process,
 * whether verified by smart contract, a pending commitment in the cache of a
 * provider or a captcha challenge.
 */
export type ProcaptchaOutput = zInfer<typeof ProcaptchaOutputSchema>

export const ProcaptchaResponse = object({
    [ApiParams.procaptchaResponse]: ProcaptchaOutputSchema,
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
    onHuman: (output: ProcaptchaOutput) => void
    onExtensionNotFound: () => void
    onChallengeExpired: () => void
    onExpired: () => void
    onFailed: () => void
    onOpen: () => void
    onClose: () => void
}
