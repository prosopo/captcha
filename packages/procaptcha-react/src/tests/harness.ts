// Copyright 2021-2026 Prosopo (UK) Ltd.
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
	type Account,
	type Captcha,
	CaptchaItemTypes,
	type CaptchaResponseBody,
	type FrictionlessState,
	type ProcaptchaClientConfigInput,
	type ProcaptchaState,
	type RandomProvider,
} from "@prosopo/types";

/**
 * Fixtures shared by the component suites. They live outside the test files so
 * the hoisted mock factories, which run before every import, can build canned
 * values from the same shapes the assertions use.
 */

export const PROVIDER_URL = "https://provider.one";
export const USER_ADDRESS = "user-address";
export const SITE_KEY = "site-key";

export const config = (
	overrides: Partial<ProcaptchaClientConfigInput> = {},
): ProcaptchaClientConfigInput => ({
	account: { address: SITE_KEY },
	defaultEnvironment: "production",
	...overrides,
});

export const state = (
	overrides: Partial<ProcaptchaState> = {},
): ProcaptchaState => ({
	isHuman: false,
	index: 0,
	solutions: [],
	captchaApi: undefined,
	challenge: undefined,
	showModal: false,
	loading: false,
	account: undefined,
	dappAccount: undefined,
	submission: undefined,
	timeout: undefined,
	successfullChallengeTimeout: undefined,
	sendData: false,
	attemptCount: 0,
	error: undefined,
	sessionId: undefined,
	retryPrompt: false,
	...overrides,
});

export const account = (): Account => ({
	account: { address: USER_ADDRESS },
});

export const randomProvider = (url: string = PROVIDER_URL): RandomProvider => ({
	providerAccount: "provider-account",
	provider: { url },
});

/** A single image captcha; `items` defaults to two distinct, hashed images. */
export const captcha = (overrides: Partial<Captcha> = {}): Captcha => ({
	captchaId: "captcha-id-1",
	captchaContentId: "captcha-content-id-1",
	salt: "0xsalt",
	target: "bus",
	items: [
		{
			hash: "hash-1",
			data: "https://provider.one/img/1.png",
			type: CaptchaItemTypes.Image,
		},
		{
			hash: "hash-2",
			data: "https://provider.one/img/2.png",
			type: CaptchaItemTypes.Image,
		},
	],
	...overrides,
});

export const challengeResponse = (
	overrides: Partial<CaptchaResponseBody> = {},
): CaptchaResponseBody => ({
	status: "ok",
	captchas: [captcha()],
	requestHash: "0xrequest-hash",
	timestamp: "1700000000000",
	signature: { provider: { requestHash: "0xprovider-request-hash" } },
	...overrides,
});

export const frictionless = (
	overrides: Partial<FrictionlessState> = {},
): FrictionlessState => ({
	provider: randomProvider(),
	userAccount: account(),
	restart: () => undefined,
	...overrides,
});
