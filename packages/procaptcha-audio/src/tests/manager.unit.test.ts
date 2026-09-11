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

import type { pickIpMode } from "@prosopo/procaptcha-common";
import {
	ApiParams,
	type AudioCaptchaSolutionResponse,
	type AudioEvent,
	CaptchaType,
	type ClientMetaData,
	type EnvironmentTypes,
	type FrictionlessState,
	type GetAudioCaptchaResponse,
	type PackedBehavioralData,
	type ProcaptchaCallbacks,
	type ProcaptchaClientConfigInput,
	type ProcaptchaState,
	type ProviderSelectRetryContext,
	type RandomProvider,
	decodeProcaptchaOutput,
} from "@prosopo/types";
import { extractData } from "@prosopo/util";
import {
	type Mock,
	afterEach,
	beforeEach,
	describe,
	expect,
	test,
	vi,
} from "vitest";
import { Manager } from "../services/Manager.js";
import {
	OTHER_PROVIDER_URL,
	PROVIDER_URL,
	SITE_KEY,
	USER_ADDRESS,
	account,
	accountWithoutExtension,
	audioEvents,
	callbacks,
	challengeResponse,
	collector,
	config,
	frictionless,
	randomProvider,
	signRawMock,
	solutionResponse,
	state,
	timerHandle,
} from "./managerHarness.js";

// Taken from procaptcha-common rather than @prosopo/load-balancer directly, so
// the test does not pull a dependency into this package that the source has no
// use for.
type IpMode = ReturnType<typeof pickIpMode>;

/**
 * Everything the manager reaches out to is replaced here. The manager itself is
 * a closure over its collaborators rather than a class with injection points,
 * so the module boundary is the seam: each mock keeps the real export list
 * intact and swaps only the call the manager makes.
 */
const mocks = vi.hoisted(() => {
	const providerApiConstructions: { url: string; siteKey: string }[] = [];
	const getAudioCaptchaChallenge =
		vi.fn<
			(
				user: string,
				dapp: string,
				sessionId?: string,
				simdReadings?: string,
			) => Promise<GetAudioCaptchaResponse>
		>();
	const submitAudioCaptchaSolution =
		vi.fn<
			(
				challenge: GetAudioCaptchaResponse,
				userAccount: string,
				dappAccount: string,
				answer: string,
				replays: number,
				audioEvents: AudioEvent[],
				userTimestampSignature: string,
				behavioralData?: string,
				salt?: string,
				simdReadings?: string,
				clientMetaData?: ClientMetaData,
			) => Promise<AudioCaptchaSolutionResponse>
		>();

	class ProviderApiMock {
		public getAudioCaptchaChallenge = getAudioCaptchaChallenge;
		public submitAudioCaptchaSolution = submitAudioCaptchaSolution;
		constructor(url: string, siteKey: string) {
			providerApiConstructions.push({ url, siteKey });
		}
	}

	const getAccount = vi.fn<() => Promise<unknown>>();
	class ExtensionMock {
		public getAccount = getAccount;
	}
	const extensionLoader = vi.fn<(web2: boolean) => Promise<unknown>>();
	const getProcaptchaRandomActiveProvider =
		vi.fn<
			(
				defaultEnvironment: EnvironmentTypes,
				ipMode?: IpMode,
				retryContext?: ProviderSelectRetryContext,
			) => Promise<RandomProvider>
		>();
	const getSimdReadingsForSubmit =
		vi.fn<(frictionlessState?: FrictionlessState) => Promise<string>>();
	const sleep = vi.fn<(ms: number) => Promise<void>>();

	return {
		providerApiConstructions,
		getAudioCaptchaChallenge,
		submitAudioCaptchaSolution,
		ProviderApiMock,
		getAccount,
		ExtensionMock,
		extensionLoader,
		getProcaptchaRandomActiveProvider,
		getSimdReadingsForSubmit,
		sleep,
	};
});

vi.mock("@prosopo/api", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@prosopo/api")>();
	return { ...actual, ProviderApi: mocks.ProviderApiMock };
});

vi.mock("@prosopo/procaptcha-common", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@prosopo/procaptcha-common")>();
	return {
		...actual,
		ExtensionLoader: mocks.extensionLoader,
		getProcaptchaRandomActiveProvider: mocks.getProcaptchaRandomActiveProvider,
		getSimdReadingsForSubmit: mocks.getSimdReadingsForSubmit,
		// The real retry, minus its exponential backoff: the delay is covered by
		// the procaptcha-common suite and waiting for it here would add seconds
		// per test for behaviour this suite isn't asserting.
		providerRetry: (
			currentFn: () => Promise<void>,
			retryFn: () => Promise<void>,
			stateReset: () => void,
			attemptCount: number,
			retryMax: number,
		) =>
			actual.providerRetry(
				currentFn,
				retryFn,
				stateReset,
				attemptCount,
				retryMax,
				0,
			),
	};
});

vi.mock("@prosopo/util", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@prosopo/util")>();
	return { ...actual, sleep: mocks.sleep };
});

interface Harness {
	manager: ReturnType<typeof Manager>;
	state: ProcaptchaState;
	updates: Partial<ProcaptchaState>[];
	events: {
		onHuman: Mock<(token: string) => void>;
		onFailed: Mock<() => void>;
		onExpired: Mock<() => void>;
		onReset: Mock<() => void>;
	};
	restart: Mock<() => void>;
}

interface HarnessOptions {
	configInput?: ProcaptchaClientConfigInput;
	initialState?: Partial<ProcaptchaState>;
	frictionlessState?: FrictionlessState;
	withFrictionless?: boolean;
	honeypot?: () => string | undefined;
}

const build = (options: HarnessOptions = {}): Harness => {
	const currentState = state(options.initialState);
	const updates: Partial<ProcaptchaState>[] = [];
	const events = {
		onHuman: vi.fn<(token: string) => void>(),
		onFailed: vi.fn<() => void>(),
		onExpired: vi.fn<() => void>(),
		onReset: vi.fn<() => void>(),
	};
	const restart = vi.fn<() => void>();
	const callbackInput: ProcaptchaCallbacks = callbacks(events);
	const frictionlessState =
		options.frictionlessState ??
		(options.withFrictionless === false
			? undefined
			: frictionless({ restart }));
	const manager = Manager(
		options.configInput ?? config(),
		currentState,
		(next: Partial<ProcaptchaState>) => {
			updates.push({ ...next });
		},
		callbackInput,
		frictionlessState,
		options.honeypot,
	);
	return { manager, state: currentState, updates, events, restart };
};

/** The last value the manager pushed for a given state field. */
const lastUpdate = <K extends keyof ProcaptchaState>(
	harness: Harness,
	key: K,
): ProcaptchaState[K] | undefined => {
	const withKey = harness.updates.filter((update) => key in update);
	return withKey.length === 0 ? undefined : withKey[withKey.length - 1]?.[key];
};

const submitArgs = (
	callIndex = 0,
): Parameters<typeof mocks.submitAudioCaptchaSolution> => {
	const call = mocks.submitAudioCaptchaSolution.mock.calls[callIndex];
	if (!call) throw new Error("expected a solution to have been submitted");
	return call;
};

/** Drives a full solve: start, then type an answer. */
const solve = async (harness: Harness): Promise<boolean> => {
	await harness.manager.start(11, 22);
	return harness.manager.submitSolution("96475", 2, audioEvents());
};

const signRaw = signRawMock;

beforeEach(() => {
	vi.clearAllMocks();
	mocks.providerApiConstructions.length = 0;
	signRaw.mockResolvedValue({ id: 1, signature: "0xuser-signature" });
	mocks.getAccount.mockResolvedValue(account(signRaw));
	mocks.extensionLoader.mockResolvedValue(mocks.ExtensionMock);
	mocks.getProcaptchaRandomActiveProvider.mockResolvedValue(randomProvider());
	mocks.getAudioCaptchaChallenge.mockResolvedValue(challengeResponse());
	mocks.submitAudioCaptchaSolution.mockResolvedValue(solutionResponse());
	mocks.getSimdReadingsForSubmit.mockResolvedValue("simd-readings");
	mocks.sleep.mockResolvedValue(undefined);
	// providerRetry reports every failure it swallows; the suite drives those
	// paths deliberately and the output would bury the real failures.
	vi.spyOn(console, "error").mockImplementation(() => undefined);
	vi.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe("the challenge never carries its own answer", () => {
	test("nothing the provider hands back could hold the transcript", async () => {
		const harness = build();
		const challenge = await harness.manager.start();
		if (!challenge) throw new Error("expected a challenge");
		// Structural, not incidental: a field named for the answer would have
		// to be added to GetAudioCaptchaResponse for this to start passing
		// something through, and this asserts nobody has.
		expect(Object.keys(challenge)).not.toContain("answer");
		expect(Object.keys(challenge)).not.toContain("solution");
		expect(Object.keys(challenge)).not.toContain("transcript");
	});
});

describe("start: the cases it refuses to run", () => {
	test("a solve already in flight is left alone", async () => {
		const harness = build({ initialState: { loading: true } });
		await harness.manager.start();
		expect(mocks.getAudioCaptchaChallenge).not.toHaveBeenCalled();
		expect(harness.updates).toHaveLength(0);
	});

	test("a user already proven human is not asked again", async () => {
		const harness = build({ initialState: { isHuman: true } });
		await harness.manager.start();
		expect(mocks.getAudioCaptchaChallenge).not.toHaveBeenCalled();
		expect(harness.events.onHuman).not.toHaveBeenCalled();
	});

	test("a refused start still resolves, with no challenge to hand back", async () => {
		const harness = build({ initialState: { isHuman: true } });
		await expect(harness.manager.start()).resolves.toBeUndefined();
	});
});

describe("start: getting to a challenge", () => {
	test("resets the widget first, so a stale challenge cannot linger", async () => {
		const harness = build({ initialState: { index: 3, showModal: true } });
		await harness.manager.start();
		const resetAt = harness.updates.findIndex(
			(update) => "showModal" in update,
		);
		expect(harness.updates[resetAt]).toMatchObject({
			showModal: false,
			loading: false,
			index: 0,
			isHuman: false,
		});
		expect(harness.events.onReset).toHaveBeenCalled();
	});

	test("counts the attempt, so provider selection can rotate on a retry", async () => {
		const harness = build({ initialState: { attemptCount: 2 } });
		await harness.manager.start();
		expect(lastUpdate(harness, "attemptCount")).toBe(3);
	});

	test("asks the provider named by the frictionless state, when there is one", async () => {
		const harness = build();
		await harness.manager.start();
		expect(mocks.getProcaptchaRandomActiveProvider).not.toHaveBeenCalled();
		expect(mocks.providerApiConstructions).toEqual([
			{ url: PROVIDER_URL, siteKey: SITE_KEY },
		]);
	});

	test("picks a provider itself when the frictionless state has none", async () => {
		const harness = build({
			frictionlessState: frictionless({ provider: undefined }),
		});
		await harness.manager.start();
		expect(mocks.getProcaptchaRandomActiveProvider).toHaveBeenCalledWith(
			"production",
			undefined,
			{ attempt: 1, excludeUrl: undefined },
		);
	});

	test("excludes the provider that just failed from the next pick", async () => {
		const harness = build({
			frictionlessState: frictionless({ provider: undefined }),
		});
		await harness.manager.start();
		await harness.manager.start();
		expect(mocks.getProcaptchaRandomActiveProvider).toHaveBeenLastCalledWith(
			"production",
			undefined,
			expect.objectContaining({ excludeUrl: PROVIDER_URL }),
		);
	});

	test("loads an extension account when there is no frictionless state", async () => {
		const harness = build({ withFrictionless: false });
		await harness.manager.start();
		expect(mocks.extensionLoader).toHaveBeenCalled();
		expect(lastUpdate(harness, "account")).toEqual({
			account: { address: USER_ADDRESS },
		});
	});

	test("records the site key it was configured with as the dapp account", async () => {
		const harness = build();
		await harness.manager.start();
		expect(lastUpdate(harness, "dappAccount")).toBe(SITE_KEY);
	});

	test("passes the session id and prefetched SIMD readings to the challenge call", async () => {
		const getSimdReadings =
			vi.fn<(timeoutMs?: number) => Promise<string | undefined>>();
		getSimdReadings.mockResolvedValue("prefetched");
		const harness = build({
			frictionlessState: frictionless({
				sessionId: "session-1",
				getSimdReadings,
			}),
		});
		await harness.manager.start();
		expect(mocks.getAudioCaptchaChallenge).toHaveBeenCalledWith(
			USER_ADDRESS,
			SITE_KEY,
			"session-1",
			"prefetched",
		);
		expect(getSimdReadings).toHaveBeenCalledWith(0);
	});

	test("omits SIMD readings when the frictionless state cannot supply them", async () => {
		const harness = build();
		await harness.manager.start();
		expect(mocks.getAudioCaptchaChallenge).toHaveBeenCalledWith(
			USER_ADDRESS,
			SITE_KEY,
			undefined,
			undefined,
		);
	});

	test("hands the clip back and drops the loading flag", async () => {
		const harness = build();
		await expect(harness.manager.start()).resolves.toEqual(challengeResponse());
		expect(lastUpdate(harness, "loading")).toBe(false);
	});
});

describe("start: when the provider will not issue a challenge", () => {
	test("surfaces the provider's error to the widget", async () => {
		mocks.getAudioCaptchaChallenge.mockResolvedValue(
			challengeResponse({
				error: {
					message: "no session",
					key: "CAPTCHA.NO_SESSION_FOUND",
					code: 400,
				},
			}),
		);
		const harness = build();
		await harness.manager.start();
		expect(lastUpdate(harness, "error")).toEqual({
			message: "no session",
			key: "CAPTCHA.NO_SESSION_FOUND",
		});
		expect(lastUpdate(harness, "loading")).toBe(false);
	});

	test("labels an error the provider left unkeyed", async () => {
		mocks.getAudioCaptchaChallenge.mockResolvedValue(
			challengeResponse({ error: { message: "something broke", code: 500 } }),
		);
		const harness = build();
		await harness.manager.start();
		expect(lastUpdate(harness, "error")).toEqual({
			message: "something broke",
			key: "API.UNKNOWN_ERROR",
		});
	});

	test("keeps no challenge, so a submit afterwards cannot pretend one exists", async () => {
		mocks.getAudioCaptchaChallenge.mockResolvedValue(
			challengeResponse({ error: { message: "no session", code: 400 } }),
		);
		const harness = build();
		await expect(harness.manager.start()).resolves.toBeUndefined();
		await expect(harness.manager.submitSolution("1", 0, [])).rejects.toThrow();
	});

	test("web3 mode without a configured account address refuses to continue", async () => {
		const harness = build({
			configInput: config({ web2: false, userAccountAddress: "" }),
			frictionlessState: frictionless({ provider: undefined }),
		});
		await harness.manager.start();
		expect(mocks.getAudioCaptchaChallenge).not.toHaveBeenCalled();
	});

	test("retries against a fresh provider when the challenge call throws", async () => {
		mocks.getAudioCaptchaChallenge
			.mockRejectedValueOnce(new Error("provider down"))
			.mockResolvedValue(challengeResponse());
		mocks.getProcaptchaRandomActiveProvider
			.mockResolvedValueOnce(randomProvider())
			.mockResolvedValue(randomProvider(OTHER_PROVIDER_URL));
		const harness = build({
			frictionlessState: frictionless({ provider: undefined }),
		});
		await harness.manager.start();
		expect(mocks.getAudioCaptchaChallenge).toHaveBeenCalledTimes(2);
		expect(mocks.providerApiConstructions.map((c) => c.url)).toEqual([
			PROVIDER_URL,
			OTHER_PROVIDER_URL,
		]);
	});

	test("gives up once the retry budget is spent", async () => {
		mocks.getAudioCaptchaChallenge.mockRejectedValue(new Error("down"));
		const harness = build({
			frictionlessState: frictionless({ provider: undefined }),
		});
		await harness.manager.start();
		expect(mocks.getAudioCaptchaChallenge.mock.calls.length).toBeLessThan(5);
		expect(harness.events.onReset).toHaveBeenCalled();
	});
});

describe("submitSolution: refusing to submit without a challenge", () => {
	test("throws when start was never called", async () => {
		const harness = build();
		await expect(
			harness.manager.submitSolution("96475", 0, audioEvents()),
		).rejects.toThrow();
	});

	test("throws again after a reset has cleared the stored challenge", async () => {
		const harness = build();
		await harness.manager.start();
		harness.manager.resetState();
		await expect(
			harness.manager.submitSolution("96475", 0, audioEvents()),
		).rejects.toThrow();
	});

	test("refuses when the account carries no signer", async () => {
		const harness = build({
			frictionlessState: frictionless({ userAccount: account() }),
		});
		await harness.manager.start();
		await expect(
			harness.manager.submitSolution("96475", 0, audioEvents()),
		).rejects.toThrow();
		expect(lastUpdate(harness, "loading")).toBe(false);
	});

	test("refuses when the account has no extension at all", async () => {
		const harness = build({
			frictionlessState: frictionless({
				userAccount: accountWithoutExtension(),
			}),
		});
		await harness.manager.start();
		await expect(
			harness.manager.submitSolution("96475", 0, audioEvents()),
		).rejects.toThrow();
	});

	test("clears loading and rethrows when the provider call fails", async () => {
		mocks.submitAudioCaptchaSolution.mockRejectedValue(new Error("boom"));
		const harness = build();
		await harness.manager.start();
		await expect(
			harness.manager.submitSolution("96475", 0, audioEvents()),
		).rejects.toThrow("boom");
		expect(lastUpdate(harness, "loading")).toBe(false);
	});
});

describe("submitSolution: what it sends", () => {
	test("sends the typed answer, replay count and event trail as given", async () => {
		const harness = build();
		const events = audioEvents();
		await harness.manager.start();
		await harness.manager.submitSolution("8 3 7 4 4", 3, events);
		const args = submitArgs();
		// Separators are the grader's problem, not the widget's: the manager
		// sends what the user typed and the provider strips non-digits.
		expect(args[3]).toBe("8 3 7 4 4");
		expect(args[4]).toBe(3);
		expect(args[5]).toEqual(events);
	});

	test("an empty event trail is submitted rather than rejected", async () => {
		const harness = build();
		await harness.manager.start();
		await harness.manager.submitSolution("96475", 0, []);
		expect(submitArgs()[5]).toEqual([]);
	});

	test("signs the challenge timestamp with the user's key", async () => {
		const harness = build();
		await harness.manager.start();
		await harness.manager.submitSolution("96475", 0, audioEvents());
		expect(signRaw).toHaveBeenCalledWith(
			expect.objectContaining({ address: USER_ADDRESS, type: "bytes" }),
		);
		expect(submitArgs()[6]).toBe("0xuser-signature");
	});

	test("embeds the checkbox coordinates in the salt", async () => {
		const harness = build();
		await solve(harness);
		const salt = submitArgs()[8];
		if (!salt) throw new Error("expected a salt");
		expect(extractData(salt)).toEqual([11, 22]);
	});

	test("attaches the SIMD readings gathered at submit time", async () => {
		const harness = build();
		await solve(harness);
		expect(submitArgs()[9]).toBe("simd-readings");
	});

	test("sends the honeypot value when the input was filled", async () => {
		const harness = build({ honeypot: () => "trap" });
		await solve(harness);
		expect(submitArgs()[10]).toEqual({ hp: "trap" });
	});

	test("sends the site's session id so the verify call can correlate it", async () => {
		const harness = build({
			configInput: config({ clientSessionId: "client-session-1" }),
		});
		await solve(harness);
		expect(submitArgs()[10]).toEqual({ clientSessionId: "client-session-1" });
	});

	test("sends no client metadata when the honeypot is empty", async () => {
		const harness = build({ honeypot: () => undefined });
		await solve(harness);
		expect(submitArgs()[10]).toBeUndefined();
	});

	test("sends no client metadata when there is no honeypot at all", async () => {
		const harness = build();
		await solve(harness);
		expect(submitArgs()[10]).toBeUndefined();
	});
});

describe("submitSolution: behavioural data", () => {
	const withCollectors = (
		encryptBehavioralData: (data: string) => Promise<string>,
	): FrictionlessState =>
		frictionless({
			encryptBehavioralData,
			behaviorCollector1: collector([{ x: 1, y: 2, timestamp: 3 }]),
			deviceCapability: "high",
		});

	test("encrypts and attaches what the collectors gathered", async () => {
		const encrypt = vi.fn<(data: string) => Promise<string>>();
		encrypt.mockResolvedValue("encrypted");
		const harness = build({ frictionlessState: withCollectors(encrypt) });
		await solve(harness);
		expect(submitArgs()[7]).toBe("encrypted");
		const payload: unknown = JSON.parse(encrypt.mock.calls[0]?.[0] ?? "null");
		expect(payload).toMatchObject({
			collector1: [{ x: 1, y: 2, timestamp: 3 }],
			collector2: [],
			collector3: [],
			deviceCapability: "high",
		});
	});

	test("submits without behavioural data when encryption fails", async () => {
		const encrypt = vi.fn<(data: string) => Promise<string>>();
		encrypt.mockRejectedValue(new Error("no key"));
		const harness = build({ frictionlessState: withCollectors(encrypt) });
		await expect(solve(harness)).resolves.toBe(true);
		expect(submitArgs()[7]).toBeUndefined();
	});

	test("packs the data first when a packer is provided", async () => {
		const packed: PackedBehavioralData = {
			c1: [],
			c2: [],
			c3: [],
			d: "high",
		};
		const encrypt = vi.fn<(data: string) => Promise<string>>();
		encrypt.mockResolvedValue("encrypted");
		const base = withCollectors(encrypt);
		const harness = build({
			frictionlessState: {
				...base,
				packBehavioralData: (): PackedBehavioralData => packed,
			},
		});
		await solve(harness);
		expect(encrypt).toHaveBeenCalledWith(JSON.stringify(packed));
	});

	test("skips the whole step when no collector is attached", async () => {
		const encrypt = vi.fn<(data: string) => Promise<string>>();
		const harness = build({
			frictionlessState: frictionless({ encryptBehavioralData: encrypt }),
		});
		await solve(harness);
		expect(encrypt).not.toHaveBeenCalled();
		expect(submitArgs()[7]).toBeUndefined();
	});

	test("skips the whole step when nothing can encrypt", async () => {
		const harness = build({
			frictionlessState: frictionless({
				behaviorCollector1: collector([]),
			}),
		});
		await solve(harness);
		expect(submitArgs()[7]).toBeUndefined();
	});
});

describe("submitSolution: the verdict", () => {
	test("marks the user human and emits a token the provider can verify", async () => {
		const harness = build();
		await expect(solve(harness)).resolves.toBe(true);
		expect(lastUpdate(harness, "isHuman")).toBe(true);
		const token = harness.events.onHuman.mock.calls[0]?.[0];
		if (!token) throw new Error("expected a token");
		expect(decodeProcaptchaOutput(token)).toMatchObject({
			[ApiParams.providerUrl]: PROVIDER_URL,
			[ApiParams.user]: USER_ADDRESS,
			[ApiParams.dapp]: SITE_KEY,
			// The dapp server dispatches on this, so a token minted as the
			// wrong type would be verified against the wrong endpoint.
			[ApiParams.captchaType]: CaptchaType.audio,
		});
	});

	test("expires the human state once the solution timeout elapses", async () => {
		vi.useFakeTimers();
		const harness = build();
		await solve(harness);
		expect(lastUpdate(harness, "successfullChallengeTimeout")).toBeDefined();
		await vi.runOnlyPendingTimersAsync();
		expect(harness.events.onExpired).toHaveBeenCalled();
		expect(lastUpdate(harness, "isHuman")).toBe(false);
	});

	test("a rejected answer fails the widget and restarts frictionless", async () => {
		mocks.submitAudioCaptchaSolution.mockResolvedValue(
			solutionResponse({ verified: false }),
		);
		const harness = build();
		await expect(solve(harness)).resolves.toBe(false);
		expect(harness.events.onFailed).toHaveBeenCalled();
		expect(harness.events.onHuman).not.toHaveBeenCalled();
		expect(harness.restart).toHaveBeenCalled();
		expect(lastUpdate(harness, "isHuman")).toBe(false);
	});

	test("a rejected answer without a frictionless state still resets", async () => {
		mocks.submitAudioCaptchaSolution.mockResolvedValue(
			solutionResponse({ verified: false }),
		);
		const harness = build({ withFrictionless: false });
		await expect(solve(harness)).resolves.toBe(false);
		expect(harness.events.onReset).toHaveBeenCalled();
	});

	test("a spent challenge cannot be answered twice", async () => {
		const harness = build();
		await solve(harness);
		// The provider enforces single use; the manager's part of that is
		// dropping the stored challenge on the reset that follows a solve.
		harness.manager.resetState();
		await expect(
			harness.manager.submitSolution("96475", 2, audioEvents()),
		).rejects.toThrow();
		expect(mocks.submitAudioCaptchaSolution).toHaveBeenCalledTimes(1);
	});
});

describe("resetState", () => {
	test("clears the widget back to its defaults and announces the reset", () => {
		const harness = build();
		harness.manager.resetState();
		expect(harness.updates).toContainEqual(
			expect.objectContaining({
				showModal: false,
				loading: false,
				index: 0,
				isHuman: false,
			}),
		);
		expect(harness.events.onReset).toHaveBeenCalledTimes(1);
	});

	test("clears both timers so a stale expiry cannot fire later", () => {
		const clear = vi.spyOn(window, "clearTimeout");
		const harness = build({
			initialState: {
				timeout: timerHandle(11),
				successfullChallengeTimeout: timerHandle(22),
			},
		});
		harness.manager.resetState();
		expect(clear).toHaveBeenCalledWith(timerHandle(11));
		expect(clear).toHaveBeenCalledWith(timerHandle(22));
	});

	test("runs the frictionless restart it is handed", () => {
		const restart = vi.fn<() => void>();
		const harness = build();
		harness.manager.resetState(restart);
		expect(restart).toHaveBeenCalledTimes(1);
	});

	test("a start after a reset re-fetches rather than reusing the old clip", async () => {
		const harness = build();
		await harness.manager.start();
		harness.manager.resetState();
		await harness.manager.start();
		expect(mocks.getAudioCaptchaChallenge).toHaveBeenCalledTimes(2);
	});
});
