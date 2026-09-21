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

import type {
	Account,
	FrictionlessState,
	GetPuzzleCaptchaResponse,
	MouseMovementPoint,
	ProcaptchaCallbacks,
	ProcaptchaClientConfigInput,
	ProcaptchaState,
	PuzzleCaptchaSolutionResponse,
	PuzzleEvent,
	RandomProvider,
} from "@prosopo/types";
import { vi } from "vitest";

/**
 * Shared fixtures for the puzzle suites. Kept out of the test files so the mock
 * factories, which vitest hoists above every import, can build their canned
 * responses from the same shapes the assertions use.
 */

export const PROVIDER_URL = "https://provider.one";
export const OTHER_PROVIDER_URL = "https://provider.two";
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
	...overrides,
});

export type SignRaw = NonNullable<
	NonNullable<Account["extension"]>["signer"]["signRaw"]
>;

/**
 * An account carrying just enough of an injected extension to sign: the rest of
 * the interface is never touched by the manager, but the type demands it.
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

export const challengeResponse = (
	overrides: Partial<GetPuzzleCaptchaResponse> = {},
): GetPuzzleCaptchaResponse => ({
	challenge: "0x1___0xdeadbeef___1700000000000",
	background: "data:image/webp;base64,UklGRg==",
	piece: "data:image/webp;base64,UklGRg==",
	pieceSize: 44,
	originX: 20,
	originY: 100,
	timestamp: "1700000000000",
	signature: { provider: { challenge: "0xprovider-challenge" } },
	status: "ok",
	...overrides,
});

export const solutionResponse = (
	overrides: Partial<PuzzleCaptchaSolutionResponse> = {},
): PuzzleCaptchaSolutionResponse => ({
	verified: true,
	status: "ok",
	...overrides,
});

export const puzzleEvents = (): PuzzleEvent[] => [
	{ x: 20, y: 100, t: 0 },
	{ x: 120, y: 90, t: 120 },
	{ x: 200, y: 80, t: 260 },
];

export const callbacks = (
	overrides: Partial<ProcaptchaCallbacks> = {},
): ProcaptchaCallbacks => ({ ...overrides });

/**
 * The signer every fixture account uses, so a test can assert on what the
 * manager asked the extension to sign without rebuilding the frictionless
 * state it was handed.
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

/**
 * A behaviour collector holding a fixed set of points. The manager only ever
 * calls `getData`, but the type demands the whole lifecycle, so the rest are
 * stubs rather than omissions.
 */
export const collector = (
	points: MouseMovementPoint[],
): NonNullable<FrictionlessState["behaviorCollector1"]> => ({
	start: () => undefined,
	stop: () => undefined,
	getData: () => points,
	clear: () => undefined,
});

/**
 * jsdom's setTimeout hands back a plain number while the shared state types the
 * handle as Node's Timeout, so tests that seed a pending timer have to bridge
 * the two. The value the manager passes to clearTimeout is the number itself.
 */
export const timerHandle = (id: number): ReturnType<typeof setTimeout> =>
	id as unknown as ReturnType<typeof setTimeout>;
