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
	type CaptchaSolutionResponse,
	type FrictionlessState,
	type ProcaptchaCallbacks,
	type ProcaptchaClientConfigInput,
	type ProcaptchaClientConfigOutput,
	ProcaptchaConfigSchema,
	type ProcaptchaState,
	type RandomProvider,
} from "@prosopo/types";
import { vi } from "vitest";

/**
 * Shared fixtures for the image-captcha manager suite. These live outside the
 * test file because vitest hoists `vi.mock` factories above every import, and
 * those factories need to build canned responses from the same shapes the
 * assertions later read back.
 */

export const PROVIDER_URL = "https://provider.one";
export const OTHER_PROVIDER_URL = "https://provider.two";
export const USER_ADDRESS = "user-address";
export const SITE_KEY = "site-key";

/**
 * The manager consumes a *parsed* config (it reads
 * `captchas.image.solutionTimeout`), so the fixture runs the real schema rather
 * than hand-rolling the defaults.
 */
export const config = (
	overrides: Partial<ProcaptchaClientConfigInput> = {},
): ProcaptchaClientConfigOutput =>
	ProcaptchaConfigSchema.parse({
		userAccountAddress: "",
		account: { address: SITE_KEY },
		defaultEnvironment: "production",
		web2: true,
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

export type SignRaw = NonNullable<
	NonNullable<Account["extension"]>["signer"]["signRaw"]
>;

/**
 * An account carrying just enough of an injected extension to sign: the manager
 * never touches the rest of the interface, but the type demands it.
 */
export const account = (signRaw?: SignRaw): Account => ({
	account: { address: USER_ADDRESS },
	extension: {
		name: "test-extension",
		version: "0.0.0",
		accounts: {
			get: async () => [{ address: USER_ADDRESS }],
			subscribe: () => () => undefined,
		},
		signer: signRaw ? { signRaw } : {},
	},
});

export const accountWithoutExtension = (): Account => ({
	account: { address: USER_ADDRESS },
});

export const randomProvider = (url: string = PROVIDER_URL): RandomProvider => ({
	providerAccount: "provider-account",
	provider: { url },
});

export const captcha = (overrides: Partial<Captcha> = {}): Captcha => ({
	captchaId: "captcha-id-1",
	captchaContentId: "captcha-content-id-1",
	datasetId: "dataset-id",
	salt: "0xsalt",
	target: "cars",
	items: [
		{
			hash: "hash-1",
			data: "http://provider.one/img/1.png",
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
	captchas: [captcha()],
	requestHash: "0xrequest-hash",
	timestamp: "1700000000000",
	signature: { provider: { requestHash: "0xprovider-request-hash" } },
	status: "ok",
	...overrides,
});

export const solutionResponse = (
	overrides: Partial<CaptchaSolutionResponse> = {},
): CaptchaSolutionResponse => ({
	captchas: [{ captchaId: "captcha-id-1", proof: [["0xproof"]] }],
	verified: true,
	status: "ok",
	...overrides,
});

export const callbacks = (
	overrides: Partial<ProcaptchaCallbacks> = {},
): ProcaptchaCallbacks => ({ ...overrides });

/**
 * The signer every fixture account uses, so a test can assert on what the
 * manager asked the extension to sign without rebuilding the frictionless state
 * it was handed.
 */
export const signRawMock = vi.fn<SignRaw>();

export const frictionless = (
	overrides: Partial<FrictionlessState> = {},
): FrictionlessState => ({
	provider: randomProvider(),
	userAccount: account(signRawMock),
	restart: () => undefined,
	...overrides,
});
