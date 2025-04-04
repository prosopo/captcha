// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import type {
	InjectedAccount,
	InjectedExtension,
} from "@polkadot/extension-inject/types";
import { object } from "zod";
import { ApiParams } from "../api/index.js";
import type { CaptchaResponseBody } from "../provider/index.js";
import type { ProcaptchaApiInterface } from "./api.js";
import type { TCaptchaSubmitResult } from "./client.js";
import { type ProcaptchaToken, ProcaptchaTokenSpec } from "./token.js";

/**
 * House the account and associated extension.
 */
export interface Account {
	account: InjectedAccount;
	extension?: InjectedExtension;
}

export const ProcaptchaResponse = object({
	[ApiParams.procaptchaResponse]: ProcaptchaTokenSpec,
});

/**
 * The state of Procaptcha. This is mutated as required to reflect the captcha
 * process.
 */
export interface ProcaptchaState {
	isHuman: boolean; // is the user human?
	index: number; // the index of the captcha round currently being shown
	solutions: string[][]; // the solutions for each captcha round
	captchaApi: ProcaptchaApiInterface | undefined; // the captcha api instance for managing captcha challenge. undefined if not set up
	challenge: CaptchaResponseBody | undefined; // the captcha challenge from the provider. undefined if not set up
	showModal: boolean; // whether to show the modal or not
	loading: boolean; // whether the captcha is loading or not
	account: Account | undefined; // the account operating the challenge. undefined if not set
	dappAccount: string | undefined; // the account of the dapp. undefined if not set (soon to be siteKey)
	submission: TCaptchaSubmitResult | undefined; // the result of the captcha submission. undefined if not submitted
	timeout: NodeJS.Timeout | undefined; // the timer for the captcha challenge. undefined if not set
	successfullChallengeTimeout: NodeJS.Timeout | undefined; // the timer for the captcha challenge. undefined if not set
	sendData: boolean; // whether to trigger sending user event data (mouse, keyboard, touch) to the provider
	attemptCount: number; // Number of attempts to successfully complete captcha without errors
	error: { message: string; key: string } | undefined; // any error message
	sessionId: string | undefined; // the session id for the captcha challenge
}

/**
 * Function to update the state of the Procaptcha component. This is a partial
 * state which is coalesced with the existing state, replacing any fields that
 * are defined and using values from the current state for any undefined state
 * variables.
 */
export type ProcaptchaStateUpdateFn = (state: Partial<ProcaptchaState>) => void;

/** List of callbacks that Procaptcha widgets must implement. */
export interface Callbacks {
	onHuman: (token: ProcaptchaToken) => void;
	onExtensionNotFound: () => void;
	onChallengeExpired: () => void;
	onExpired: () => void;
	onError: (error: Error) => void;
	onClose: () => void;
	onOpen: () => void;
	onFailed: () => void;
	onReload: () => void;
	onReset: () => void;
}
