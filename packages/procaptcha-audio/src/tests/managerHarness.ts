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

import { defaultProcaptchaState } from "@prosopo/procaptcha-common";
import type {
	Account,
	AudioCaptchaSolutionResponse,
	AudioEvent,
	FrictionlessState,
	GetAudioCaptchaResponse,
	MouseMovementPoint,
	ProcaptchaCallbacks,
	ProcaptchaClientConfigInput,
	ProcaptchaState,
	RandomProvider,
} from "@prosopo/types";
import { vi } from "vitest";

/**
 * Kept out of the test files so vitest's hoisted mock factories can build
 * their canned responses from the same fixtures the assertions use.
 */

export const PROVIDER_URL = "https://provider.one";
export const OTHER_PROVIDER_URL = "https://provider.two";
export const USER_ADDRESS = "user-address";
export const SITE_KEY = "site-key";

export const CLIP_URI = "data:audio/wav;base64,UklGRiQAAABXQVZF";

export const config = (
	overrides: Partial<ProcaptchaClientConfigInput> = {},
): ProcaptchaClientConfigInput => ({
	account: { address: SITE_KEY },
	defaultEnvironment: "production",
	...overrides,
});

export const state = (
	overrides: Partial<ProcaptchaState> = {},
): ProcaptchaState => ({ ...defaultProcaptchaState(), ...overrides });

export type SignRaw = NonNullable<
	NonNullable<Account["extension"]>["signer"]["signRaw"]
>;

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

export const challengeResponse = (
	overrides: Partial<GetAudioCaptchaResponse> = {},
): GetAudioCaptchaResponse => ({
	challenge: "0x1___0xdeadbeef___1700000000000",
	clip: CLIP_URI,
	characterCount: 5,
	timestamp: "1700000000000",
	signature: { provider: { challenge: "0xprovider-challenge" } },
	status: "ok",
	...overrides,
});

export const solutionResponse = (
	overrides: Partial<AudioCaptchaSolutionResponse> = {},
): AudioCaptchaSolutionResponse => ({
	verified: true,
	status: "ok",
	...overrides,
});

export const audioEvents = (): AudioEvent[] => [
	{ kind: "play", t: 0 },
	{ kind: "key", t: 900 },
	{ kind: "replay", t: 1400 },
];

export const callbacks = (
	overrides: Partial<ProcaptchaCallbacks> = {},
): ProcaptchaCallbacks => ({ ...overrides });

/** Shared by every fixture account, so a test can assert on what was signed. */
export const signRawMock = vi.fn<SignRaw>();

export const frictionless = (
	overrides: Partial<FrictionlessState> = {},
): FrictionlessState => ({
	provider: randomProvider(),
	userAccount: account(signRawMock),
	restart: () => undefined,
	...overrides,
});

export const collector = (
	points: MouseMovementPoint[],
): NonNullable<FrictionlessState["behaviorCollector1"]> => ({
	start: () => undefined,
	stop: () => undefined,
	getData: () => points,
	clear: () => undefined,
});

/** jsdom's setTimeout returns a number; state types the handle as Node's Timeout. */
export const timerHandle = (id: number): ReturnType<typeof setTimeout> =>
	id as unknown as ReturnType<typeof setTimeout>;
