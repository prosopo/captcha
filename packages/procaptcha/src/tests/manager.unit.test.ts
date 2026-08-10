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

import type { IpMode } from "@prosopo/load-balancer";
import {
	ApiParams,
	type BehavioralData,
	type CaptchaResponseBody,
	type CaptchaSolution,
	type CaptchaSolutionResponse,
	CaptchaType,
	type ClickEventPoint,
	type ClientMetaData,
	type EnvironmentTypes,
	type FrictionlessState,
	type MouseMovementPoint,
	type PackedBehavioralData,
	type ProcaptchaCallbacks,
	type ProcaptchaClientConfigOutput,
	type ProcaptchaState,
	type ProviderSelectRetryContext,
	type RandomProvider,
	type TouchEventPoint,
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
import { Manager } from "../modules/Manager.js";
import {
	OTHER_PROVIDER_URL,
	PROVIDER_URL,
	SITE_KEY,
	USER_ADDRESS,
	account,
	accountWithoutExtension,
	callbacks,
	captcha,
	challengeResponse,
	config,
	frictionless,
	randomProvider,
	signRawMock,
	solutionResponse,
	state,
} from "./managerHarness.js";

/**
 * The manager is a closure over its collaborators rather than a class with
 * injection points, so the module boundary is the only seam available: each
 * mock keeps the real export list intact and replaces just the call the manager
 * makes.
 */
const mocks = vi.hoisted(() => {
	const providerApiConstructions: { url: string; siteKey: string }[] = [];
	class ProviderApiMock {
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
	const sleep = vi.fn<(ms: number) => Promise<void>>();

	const getCaptchaChallenge =
		vi.fn<
			(
				sessionId?: string,
				simdReadings?: string,
			) => Promise<CaptchaResponseBody>
		>();
	const submitCaptchaSolution =
		vi.fn<
			(
				userTimestampSignature: string,
				requestHash: string,
				solutions: CaptchaSolution[],
				timestamp: string,
				providerRequestHashSignature: string,
				behavioralData?: string,
				simdReadings?: string,
				clientMetaData?: ClientMetaData,
			) => Promise<[CaptchaSolutionResponse, string]>
		>();
	const captchaApiConstructions: {
		userAccount: string;
		provider: RandomProvider;
		web2: boolean;
		dappAccount: string;
	}[] = [];
	class ProsopoCaptchaApiMock {
		public getCaptchaChallenge = getCaptchaChallenge;
		public submitCaptchaSolution = submitCaptchaSolution;
		public provider: RandomProvider;
		constructor(
			userAccount: string,
			provider: RandomProvider,
			_providerApi: unknown,
			web2: boolean,
			dappAccount: string,
		) {
			this.provider = provider;
			captchaApiConstructions.push({
				userAccount,
				provider,
				web2,
				dappAccount,
			});
		}
	}

	return {
		providerApiConstructions,
		ProviderApiMock,
		getAccount,
		ExtensionMock,
		extensionLoader,
		getProcaptchaRandomActiveProvider,
		sleep,
		getCaptchaChallenge,
		submitCaptchaSolution,
		captchaApiConstructions,
		ProsopoCaptchaApiMock,
	};
});

vi.mock("@prosopo/api", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@prosopo/api")>();
	return { ...actual, ProviderApi: mocks.ProviderApiMock };
});

vi.mock("../modules/ProsopoCaptchaApi.js", () => ({
	default: mocks.ProsopoCaptchaApiMock,
	ProsopoCaptchaApi: mocks.ProsopoCaptchaApiMock,
}));

vi.mock("@prosopo/procaptcha-common", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@prosopo/procaptcha-common")>();
	return {
		...actual,
		ExtensionLoader: mocks.extensionLoader,
		getProcaptchaRandomActiveProvider: mocks.getProcaptchaRandomActiveProvider,
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
		onOpen: Mock<() => void>;
		onClose: Mock<() => void>;
		onError: Mock<(error: Error) => void>;
		onChallengeExpired: Mock<() => void>;
		onReload: Mock<() => void>;
	};
	restart: Mock<() => void>;
}

interface HarnessOptions {
	configInput?: ProcaptchaClientConfigOutput;
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
		onOpen: vi.fn<() => void>(),
		onClose: vi.fn<() => void>(),
		onError: vi.fn<(error: Error) => void>(),
		onChallengeExpired: vi.fn<() => void>(),
		onReload: vi.fn<() => void>(),
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
	for (let i = harness.updates.length - 1; i >= 0; i--) {
		const update = harness.updates[i];
		if (update && key in update) {
			return update[key];
		}
	}
	return undefined;
};

const wasUpdated = (harness: Harness, key: keyof ProcaptchaState): boolean =>
	harness.updates.some((update) => key in update);

beforeEach(() => {
	vi.clearAllMocks();
	mocks.providerApiConstructions.length = 0;
	mocks.captchaApiConstructions.length = 0;
	mocks.extensionLoader.mockResolvedValue(mocks.ExtensionMock);
	mocks.getAccount.mockResolvedValue(account(signRawMock));
	mocks.getProcaptchaRandomActiveProvider.mockResolvedValue(randomProvider());
	mocks.sleep.mockResolvedValue(undefined);
	mocks.getCaptchaChallenge.mockResolvedValue(challengeResponse());
	mocks.submitCaptchaSolution.mockResolvedValue([
		solutionResponse(),
		"0xcommitment",
	]);
	signRawMock.mockResolvedValue({ id: 1, signature: "0xuser-signature" });
});

afterEach(() => {
	vi.useRealTimers();
});

describe("start", () => {
	test("fires onOpen before doing any work", async () => {
		const harness = build();
		await harness.manager.start();
		expect(harness.events.onOpen).toHaveBeenCalledTimes(1);
	});

	test("does nothing when already loading", async () => {
		const harness = build({ initialState: { loading: true } });
		await harness.manager.start();
		expect(mocks.getCaptchaChallenge).not.toHaveBeenCalled();
		expect(harness.updates).toHaveLength(0);
	});

	test("does nothing when the user is already verified", async () => {
		const harness = build({ initialState: { isHuman: true } });
		await harness.manager.start();
		expect(mocks.getCaptchaChallenge).not.toHaveBeenCalled();
		expect(harness.updates).toHaveLength(0);
	});

	test("increments the attempt count from zero", async () => {
		const harness = build();
		await harness.manager.start();
		expect(lastUpdate(harness, "attemptCount")).toBe(1);
	});

	test("increments an existing attempt count", async () => {
		const harness = build({ initialState: { attemptCount: 4 } });
		await harness.manager.start();
		expect(harness.updates[1]).toEqual({ attemptCount: 5 });
	});

	test("snapshots the site key into dappAccount", async () => {
		const harness = build();
		await harness.manager.start();
		expect(lastUpdate(harness, "dappAccount")).toBe(SITE_KEY);
	});

	test("lets the UI catch up with the loading state before working", async () => {
		const harness = build();
		await harness.manager.start();
		expect(mocks.sleep).toHaveBeenCalledWith(100);
	});

	test("copies the frictionless session id into state", async () => {
		const harness = build({
			frictionlessState: frictionless({ sessionId: "session-1" }),
		});
		await harness.manager.start();
		expect(lastUpdate(harness, "sessionId")).toBe("session-1");
	});

	test("carries the frictionless provider through instead of picking one", async () => {
		const harness = build({
			frictionlessState: frictionless({
				provider: randomProvider(OTHER_PROVIDER_URL),
			}),
		});
		await harness.manager.start();
		expect(mocks.getProcaptchaRandomActiveProvider).not.toHaveBeenCalled();
		expect(mocks.providerApiConstructions).toEqual([
			{ url: OTHER_PROVIDER_URL, siteKey: SITE_KEY },
		]);
	});

	test("picks a random provider when frictionless has none", async () => {
		const harness = build({ withFrictionless: false });
		await harness.manager.start();
		expect(mocks.getProcaptchaRandomActiveProvider).toHaveBeenCalledWith(
			"production",
			undefined,
			{ attempt: 1, excludeUrl: undefined },
		);
		expect(mocks.providerApiConstructions).toEqual([
			{ url: PROVIDER_URL, siteKey: SITE_KEY },
		]);
	});

	test("excludes the previous provider on a retry", async () => {
		const harness = build({ withFrictionless: false });
		mocks.getCaptchaChallenge
			.mockRejectedValueOnce(new Error("provider down"))
			.mockResolvedValue(challengeResponse());
		mocks.getProcaptchaRandomActiveProvider
			.mockResolvedValueOnce(randomProvider(PROVIDER_URL))
			.mockResolvedValue(randomProvider(OTHER_PROVIDER_URL));

		await harness.manager.start();

		expect(mocks.getProcaptchaRandomActiveProvider).toHaveBeenCalledTimes(2);
		expect(mocks.getProcaptchaRandomActiveProvider.mock.calls[1]?.[2]).toEqual({
			attempt: 2,
			excludeUrl: PROVIDER_URL,
		});
	});

	test("builds the captcha api with the account, provider and site key", async () => {
		const harness = build({ withFrictionless: false });
		await harness.manager.start();
		expect(mocks.captchaApiConstructions).toEqual([
			{
				userAccount: USER_ADDRESS,
				provider: randomProvider(),
				web2: true,
				dappAccount: SITE_KEY,
			},
		]);
	});

	test("stores the captcha api on state", async () => {
		const harness = build();
		await harness.manager.start();
		expect(lastUpdate(harness, "captchaApi")).toBeDefined();
	});

	test("requests the challenge without simd readings when none are offered", async () => {
		const harness = build();
		await harness.manager.start();
		expect(mocks.getCaptchaChallenge).toHaveBeenCalledWith(
			undefined,
			undefined,
		);
	});

	test("attaches already-resolved simd readings to the challenge request", async () => {
		const getSimdReadings =
			vi.fn<(timeoutMs?: number) => Promise<string | undefined>>();
		getSimdReadings.mockResolvedValue("simd-data");
		const harness = build({
			frictionlessState: frictionless({ getSimdReadings }),
		});
		await harness.manager.start();
		expect(getSimdReadings).toHaveBeenCalledWith(0);
		expect(mocks.getCaptchaChallenge).toHaveBeenCalledWith(
			undefined,
			"simd-data",
		);
	});

	// The manager unconditionally overwrites `state.sessionId` with the
	// frictionless one, so a stale id left in state is dropped rather than
	// replayed against a provider that never issued it.
	test("clears a stale session id when frictionless has none", async () => {
		const harness = build({ initialState: { sessionId: "session-9" } });
		await harness.manager.start();
		expect(harness.state.sessionId).toBeUndefined();
		expect(mocks.getCaptchaChallenge).toHaveBeenCalledWith(
			undefined,
			undefined,
		);
	});

	test("passes the frictionless session id to the challenge request", async () => {
		const harness = build({
			frictionlessState: frictionless({ sessionId: "session-9" }),
		});
		await harness.manager.start();
		expect(mocks.getCaptchaChallenge).toHaveBeenCalledWith(
			"session-9",
			undefined,
		);
	});

	test("shows the modal and seeds an empty solution per captcha", async () => {
		const harness = build();
		mocks.getCaptchaChallenge.mockResolvedValue(
			challengeResponse({ captchas: [captcha(), captcha()] }),
		);
		await harness.manager.start();
		expect(lastUpdate(harness, "showModal")).toBe(true);
		expect(lastUpdate(harness, "solutions")).toEqual([[], []]);
		expect(lastUpdate(harness, "index")).toBe(0);
		expect(lastUpdate(harness, "loading")).toBe(false);
	});

	test("surfaces a challenge error onto state and the error callback", async () => {
		const harness = build();
		mocks.getCaptchaChallenge.mockResolvedValue(
			challengeResponse({
				error: { message: "no dataset", key: "API.BAD_REQUEST", code: 400 },
			}),
		);
		await harness.manager.start();
		expect(lastUpdate(harness, "error")).toEqual({
			message: "no dataset",
			key: "API.BAD_REQUEST",
		});
		expect(lastUpdate(harness, "loading")).toBe(false);
		expect(wasUpdated(harness, "showModal")).toBe(false);
		expect(harness.events.onError).toHaveBeenCalledTimes(1);
	});

	test("falls back to a generic key when the error carries none", async () => {
		const harness = build();
		mocks.getCaptchaChallenge.mockResolvedValue(
			challengeResponse({ error: { message: "boom", code: 500 } }),
		);
		await harness.manager.start();
		expect(lastUpdate(harness, "error")).toEqual({
			message: "boom",
			key: "API.UNKNOWN_ERROR",
		});
	});

	// providerRetry swallows the failure and re-enters `start`, so an empty
	// challenge surfaces to the user as a reset rather than a rejection.
	test("retries then resets when the provider never returns captchas", async () => {
		const harness = build();
		mocks.getCaptchaChallenge.mockResolvedValue(
			challengeResponse({ captchas: [] }),
		);
		await expect(harness.manager.start()).resolves.toBeUndefined();
		expect(harness.events.onReset).toHaveBeenCalled();
		expect(lastUpdate(harness, "challenge")).toBeUndefined();
	});

	test("expires the challenge once the summed time limit elapses", async () => {
		vi.useFakeTimers();
		const harness = build();
		mocks.getCaptchaChallenge.mockResolvedValue(
			challengeResponse({
				captchas: [
					captcha({ timeLimitMs: 1000 }),
					captcha({ timeLimitMs: 2000 }),
				],
			}),
		);
		await harness.manager.start();

		vi.advanceTimersByTime(2999);
		expect(harness.events.onChallengeExpired).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(harness.events.onChallengeExpired).toHaveBeenCalledTimes(1);
		expect(lastUpdate(harness, "isHuman")).toBe(false);
		expect(lastUpdate(harness, "showModal")).toBe(false);
	});

	test("falls back to the configured challenge timeout per captcha", async () => {
		vi.useFakeTimers();
		const configured = config();
		const harness = build({ configInput: configured });
		mocks.getCaptchaChallenge.mockResolvedValue(
			challengeResponse({ captchas: [captcha({ timeLimitMs: undefined })] }),
		);
		await harness.manager.start();

		vi.advanceTimersByTime(configured.captchas.image.challengeTimeout - 1);
		expect(harness.events.onChallengeExpired).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(harness.events.onChallengeExpired).toHaveBeenCalledTimes(1);
	});

	// Each nested retry bumps `attemptCount`, so the recursion terminates at the
	// retry ceiling the manager passes to providerRetry (10).
	test("gives up after the retry ceiling when the provider keeps failing", async () => {
		const harness = build();
		mocks.getCaptchaChallenge.mockRejectedValue(new Error("provider down"));
		await harness.manager.start();
		expect(mocks.getCaptchaChallenge).toHaveBeenCalledTimes(11);
		expect(harness.events.onReset).toHaveBeenCalled();
	});
});

describe("loadAccount", () => {
	test("uses the frictionless account without touching the extension", async () => {
		const frictionlessState = frictionless();
		const harness = build({ frictionlessState });
		await harness.manager.start();
		expect(mocks.getAccount).not.toHaveBeenCalled();
		expect(lastUpdate(harness, "account")).toBe(frictionlessState.userAccount);
	});

	test("asks the extension for an account when frictionless is absent", async () => {
		const harness = build({ withFrictionless: false });
		await harness.manager.start();
		expect(mocks.extensionLoader).toHaveBeenCalledWith(true);
		expect(mocks.getAccount).toHaveBeenCalledTimes(1);
	});

	test("refuses to run in web3 mode without a user account address", async () => {
		const harness = build({
			configInput: config({ web2: false }),
			withFrictionless: false,
		});
		await harness.manager.start();
		expect(mocks.getCaptchaChallenge).not.toHaveBeenCalled();
		expect(harness.events.onReset).toHaveBeenCalled();
	});

	test("accepts web3 mode when a user account address is configured", async () => {
		const harness = build({
			configInput: config({ web2: false, userAccountAddress: USER_ADDRESS }),
			withFrictionless: false,
		});
		await harness.manager.start();
		expect(mocks.getAccount).toHaveBeenCalledTimes(1);
	});

	test("prefers the account already in state over the configured one", async () => {
		const harness = build({
			configInput: config({ web2: false, userAccountAddress: "configured" }),
			initialState: { account: account(signRawMock) },
			withFrictionless: false,
		});
		await harness.manager.start();
		expect(mocks.extensionLoader).toHaveBeenCalledWith(false);
	});
});

describe("provider api construction", () => {
	test("refuses to build a provider api without a site key", async () => {
		const harness = build({
			configInput: config({ account: { address: "" } }),
		});
		await harness.manager.start();
		expect(mocks.providerApiConstructions).toHaveLength(0);
		expect(harness.events.onReset).toHaveBeenCalled();
	});
});

describe("submit", () => {
	/**
	 * Drives a real `start()` so the manager holds a captcha api, then stamps the
	 * requested state on top: start overwrites `solutions` (one empty array per
	 * captcha), so any seeded selections have to be applied afterwards.
	 */
	const started = async (
		options: HarnessOptions & { afterStart?: Partial<ProcaptchaState> } = {},
		clickX = 0,
		clickY = 0,
	): Promise<Harness> => {
		const harness = build(options);
		await harness.manager.start(clickX, clickY);
		Object.assign(harness.state, {
			solutions: [[["hash-1", 10, 20]]],
			...options.afterStart,
		});
		harness.updates.length = 0;
		return harness;
	};

	test("clears the challenge timeout before submitting", async () => {
		const harness = await started();
		await harness.manager.submit();
		expect(harness.updates[0]).toEqual({ timeout: undefined });
	});

	test("hides the modal as soon as the solution is taken", async () => {
		const harness = await started();
		await harness.manager.submit();
		expect(harness.updates[1]).toEqual({ showModal: false });
	});

	test("restarts the challenge when there is nothing in state to submit", async () => {
		const harness = build({ initialState: { challenge: undefined } });
		await harness.manager.submit();
		expect(mocks.submitCaptchaSolution).not.toHaveBeenCalled();
		expect(mocks.getCaptchaChallenge).toHaveBeenCalledTimes(1);
	});

	// Every submit failure is funnelled through providerRetry, whose retry hook
	// is `start` — so a bad submit silently restarts the whole challenge rather
	// than surfacing an error to the caller.
	test("resets instead of submitting when the challenge has no dataset id", async () => {
		mocks.getCaptchaChallenge.mockResolvedValue(
			challengeResponse({ captchas: [captcha({ datasetId: undefined })] }),
		);
		const harness = await started();
		await harness.manager.submit();
		expect(mocks.submitCaptchaSolution).not.toHaveBeenCalled();
		expect(harness.events.onReset).toHaveBeenCalled();
	});

	test("does not submit when the account carries no extension", async () => {
		const harness = await started({
			frictionlessState: frictionless({
				userAccount: accountWithoutExtension(),
			}),
		});
		await harness.manager.submit();
		expect(mocks.submitCaptchaSolution).not.toHaveBeenCalled();
		expect(harness.events.onReset).toHaveBeenCalled();
	});

	test("does not submit when the extension signer cannot sign raw data", async () => {
		const harness = await started({
			frictionlessState: frictionless({ userAccount: account() }),
		});
		await harness.manager.submit();
		expect(mocks.submitCaptchaSolution).not.toHaveBeenCalled();
		expect(harness.events.onReset).toHaveBeenCalled();
	});

	test("signs the challenge timestamp with the user's account", async () => {
		const harness = await started();
		await harness.manager.submit();
		expect(signRawMock).toHaveBeenCalledWith({
			address: USER_ADDRESS,
			data: expect.any(String),
			type: "bytes",
		});
	});

	test("embeds the checkbox click coordinates in the first captcha's salt", async () => {
		const harness = await started({}, 7, 9);
		await harness.manager.submit();
		const solutions = mocks.submitCaptchaSolution.mock.calls[0]?.[2];
		const first = solutions?.[0];
		if (!first) throw new Error("no solution submitted");
		expect(extractData(first.salt)).toEqual([7, 9, 10, 20]);
		expect(first.solution).toEqual(["hash-1"]);
	});

	test("omits the click coordinates from later captchas", async () => {
		mocks.getCaptchaChallenge.mockResolvedValue(
			challengeResponse({ captchas: [captcha(), captcha()] }),
		);
		const harness = await started(
			{ afterStart: { solutions: [[["hash-1", 1, 2]], [["hash-2", 3, 4]]] } },
			7,
			9,
		);
		await harness.manager.submit();
		const solutions = mocks.submitCaptchaSolution.mock.calls[0]?.[2];
		expect(extractData(solutions?.[1]?.salt ?? "")).toEqual([3, 4]);
	});

	test("handles a captcha with no selections at all", async () => {
		const harness = await started({ afterStart: { solutions: [[]] } });
		await harness.manager.submit();
		const solutions = mocks.submitCaptchaSolution.mock.calls[0]?.[2];
		expect(solutions?.[0]?.solution).toEqual([]);
	});

	test("forwards the request hash, timestamp and provider signature", async () => {
		const harness = await started();
		await harness.manager.submit();
		const call = mocks.submitCaptchaSolution.mock.calls[0];
		expect(call?.[0]).toBe("0xuser-signature");
		expect(call?.[1]).toBe("0xrequest-hash");
		expect(call?.[3]).toBe("1700000000000");
		expect(call?.[4]).toBe("0xprovider-request-hash");
	});

	test("marks the user as human when the provider verifies the solution", async () => {
		const harness = await started();
		await harness.manager.submit();
		expect(lastUpdate(harness, "isHuman")).toBe(true);
		expect(harness.events.onHuman).toHaveBeenCalledTimes(1);
	});

	test("emits a token describing the accepted solution", async () => {
		const harness = await started();
		await harness.manager.submit();
		const token = harness.events.onHuman.mock.calls[0]?.[0];
		if (!token) throw new Error("no token emitted");
		const decoded = decodeProcaptchaOutput(token);
		expect(decoded[ApiParams.user]).toBe(USER_ADDRESS);
		expect(decoded[ApiParams.dapp]).toBe(SITE_KEY);
		expect(decoded[ApiParams.providerUrl]).toBe(PROVIDER_URL);
		expect(decoded[ApiParams.captchaType]).toBe(CaptchaType.image);
		expect(decoded[ApiParams.timestamp]).toBe("1700000000000");
	});

	test("expires the human verdict after the configured solution timeout", async () => {
		vi.useFakeTimers();
		const configured = config();
		const harness = await started({ configInput: configured });
		await harness.manager.submit();
		vi.advanceTimersByTime(configured.captchas.image.solutionTimeout);
		expect(harness.events.onExpired).toHaveBeenCalledTimes(1);
		expect(lastUpdate(harness, "isHuman")).toBe(false);
	});

	test("fails and restarts frictionless when the solution is rejected", async () => {
		const harness = await started();
		mocks.submitCaptchaSolution.mockResolvedValue([
			solutionResponse({ verified: false }),
			"0xcommitment",
		]);
		await harness.manager.submit();
		expect(harness.events.onFailed).toHaveBeenCalledTimes(1);
		expect(harness.events.onReset).toHaveBeenCalled();
		expect(harness.restart).toHaveBeenCalledTimes(1);
	});

	test("does not submit when no captcha api was ever built", async () => {
		const harness = build({
			initialState: {
				challenge: challengeResponse(),
				solutions: [[["hash-1", 1, 2]]],
				account: account(signRawMock),
			},
		});
		await harness.manager.submit();
		expect(mocks.submitCaptchaSolution).not.toHaveBeenCalled();
		expect(harness.events.onReset).toHaveBeenCalled();
	});

	test("does not submit when no account has been loaded", async () => {
		const harness = build({
			initialState: {
				challenge: challengeResponse(),
				solutions: [[["hash-1", 1, 2]]],
				account: undefined,
			},
		});
		await harness.manager.submit();
		expect(mocks.submitCaptchaSolution).not.toHaveBeenCalled();
		expect(harness.events.onReset).toHaveBeenCalled();
	});

	test("does not emit a token when the dapp account is missing from state", async () => {
		const harness = await started({ afterStart: { dappAccount: undefined } });
		await harness.manager.submit();
		expect(harness.events.onHuman).not.toHaveBeenCalled();
		expect(harness.events.onReset).toHaveBeenCalled();
	});

	test("sends the honeypot value as client metadata when filled", async () => {
		const harness = await started({ honeypot: () => "i-am-a-bot" });
		await harness.manager.submit();
		expect(mocks.submitCaptchaSolution.mock.calls[0]?.[7]).toEqual({
			hp: "i-am-a-bot",
		});
	});

	test("omits client metadata when the honeypot is empty", async () => {
		const harness = await started({ honeypot: () => "" });
		await harness.manager.submit();
		expect(mocks.submitCaptchaSolution.mock.calls[0]?.[7]).toBeUndefined();
	});

	test("omits client metadata when no honeypot reader is supplied", async () => {
		const harness = await started();
		await harness.manager.submit();
		expect(mocks.submitCaptchaSolution.mock.calls[0]?.[7]).toBeUndefined();
	});

	test("waits for simd readings before submitting", async () => {
		const getSimdReadings =
			vi.fn<(timeoutMs?: number) => Promise<string | undefined>>();
		getSimdReadings.mockResolvedValue("simd-submit");
		const harness = await started({
			frictionlessState: frictionless({ getSimdReadings, restart: vi.fn() }),
		});
		await harness.manager.submit();
		expect(mocks.submitCaptchaSolution.mock.calls[0]?.[6]).toBe("simd-submit");
	});

	describe("behavioural data", () => {
		/** A collector stub: only `getData` is read, but the type demands the
		 * lifecycle methods the frictionless widget drives. */
		const collector = <T>(
			data: T[],
		): {
			start: () => void;
			stop: () => void;
			getData: () => T[];
			clear: () => void;
		} => ({
			start: () => undefined,
			stop: () => undefined,
			getData: () => data,
			clear: () => undefined,
		});

		const mousePoint = (x: number): MouseMovementPoint => ({
			x,
			y: 0,
			timestamp: 1,
		});
		const touchPoint = (x: number): TouchEventPoint => ({
			x,
			y: 0,
			timestamp: 1,
			eventType: "touchstart",
			touchCount: 1,
		});
		const clickPoint = (x: number): ClickEventPoint => ({
			x,
			y: 0,
			timestamp: 1,
			eventType: "click",
			button: 0,
		});

		test("encrypts the collected data when an encryptor is present", async () => {
			const encryptBehavioralData = vi.fn<(data: string) => Promise<string>>();
			encryptBehavioralData.mockResolvedValue("0xencrypted");
			const harness = await started({
				frictionlessState: frictionless({
					encryptBehavioralData,
					behaviorCollector1: collector([mousePoint(1), mousePoint(2)]),
					deviceCapability: "high",
					restart: vi.fn(),
				}),
			});
			await harness.manager.submit();
			const payload: BehavioralData = JSON.parse(
				encryptBehavioralData.mock.calls[0]?.[0] ?? "{}",
			);
			expect(payload.collector1).toEqual([mousePoint(1), mousePoint(2)]);
			expect(payload.collector2).toEqual([]);
			expect(payload.collector3).toEqual([]);
			expect(payload.deviceCapability).toBe("high");
			expect(mocks.submitCaptchaSolution.mock.calls[0]?.[5]).toBe(
				"0xencrypted",
			);
		});

		test("defaults the device capability when it was never measured", async () => {
			const encryptBehavioralData = vi.fn<(data: string) => Promise<string>>();
			encryptBehavioralData.mockResolvedValue("0xencrypted");
			const harness = await started({
				frictionlessState: frictionless({
					encryptBehavioralData,
					behaviorCollector1: collector<MouseMovementPoint>([]),
					restart: vi.fn(),
				}),
			});
			await harness.manager.submit();
			const payload: BehavioralData = JSON.parse(
				encryptBehavioralData.mock.calls[0]?.[0] ?? "{}",
			);
			expect(payload.deviceCapability).toBe("unknown");
		});

		test("packs the data first when a packer is supplied", async () => {
			const encryptBehavioralData = vi.fn<(data: string) => Promise<string>>();
			encryptBehavioralData.mockResolvedValue("0xencrypted");
			const packBehavioralData =
				vi.fn<(data: BehavioralData) => PackedBehavioralData>();
			packBehavioralData.mockReturnValue({ c1: [], c2: [], c3: [], d: "x" });
			const harness = await started({
				frictionlessState: frictionless({
					encryptBehavioralData,
					behaviorCollector2: collector([touchPoint(3)]),
					packBehavioralData,
					restart: vi.fn(),
				}),
			});
			await harness.manager.submit();
			expect(packBehavioralData).toHaveBeenCalledTimes(1);
			expect(encryptBehavioralData).toHaveBeenCalledWith(
				'{"c1":[],"c2":[],"c3":[],"d":"x"}',
			);
		});

		test("submits without behavioural data when encryption throws", async () => {
			const encryptBehavioralData = vi.fn<(data: string) => Promise<string>>();
			encryptBehavioralData.mockRejectedValue(new Error("no subtle crypto"));
			const harness = await started({
				frictionlessState: frictionless({
					encryptBehavioralData,
					behaviorCollector3: collector([clickPoint(4)]),
					restart: vi.fn(),
				}),
			});
			await harness.manager.submit();
			expect(mocks.submitCaptchaSolution.mock.calls[0]?.[5]).toBeUndefined();
			expect(harness.events.onHuman).toHaveBeenCalledTimes(1);
		});

		test("skips encryption entirely when no collector produced data", async () => {
			const encryptBehavioralData = vi.fn<(data: string) => Promise<string>>();
			const harness = await started({
				frictionlessState: frictionless({
					encryptBehavioralData,
					restart: vi.fn(),
				}),
			});
			await harness.manager.submit();
			expect(encryptBehavioralData).not.toHaveBeenCalled();
		});

		test("skips encryption when collectors exist but no encryptor does", async () => {
			const harness = await started({
				frictionlessState: frictionless({
					behaviorCollector1: collector([mousePoint(1)]),
					restart: vi.fn(),
				}),
			});
			await harness.manager.submit();
			expect(mocks.submitCaptchaSolution.mock.calls[0]?.[5]).toBeUndefined();
		});
	});
});

describe("select", () => {
	const selectable = (): Harness =>
		build({
			initialState: {
				challenge: challengeResponse(),
				solutions: [[]],
			},
		});

	test("throws without a challenge", () => {
		const harness = build();
		expect(() => harness.manager.select("hash-1")).toThrow();
	});

	test("throws when the index has run past the challenge", () => {
		const harness = build({
			initialState: { challenge: challengeResponse(), index: 1 },
		});
		expect(() => harness.manager.select("hash-1")).toThrow();
	});

	test("throws when the index is negative", () => {
		const harness = build({
			initialState: { challenge: challengeResponse(), index: -1 },
		});
		expect(() => harness.manager.select("hash-1")).toThrow();
	});

	test("adds an unselected image with its coordinates", () => {
		const harness = selectable();
		harness.manager.select("hash-1", 5, 6);
		expect(lastUpdate(harness, "solutions")).toEqual([[["hash-1", 5, 6]]]);
	});

	test("defaults missing coordinates to the origin", () => {
		const harness = selectable();
		harness.manager.select("hash-1");
		expect(lastUpdate(harness, "solutions")).toEqual([[["hash-1", 0, 0]]]);
	});

	test("removes an image that was already selected", () => {
		const harness = build({
			initialState: {
				challenge: challengeResponse(),
				solutions: [[["hash-1", 5, 6]]],
			},
		});
		harness.manager.select("hash-1");
		expect(lastUpdate(harness, "solutions")).toEqual([[]]);
	});

	test("keeps selections for other rounds untouched", () => {
		const harness = build({
			initialState: {
				challenge: challengeResponse({ captchas: [captcha(), captcha()] }),
				solutions: [[["hash-1", 1, 1]], []],
				index: 1,
			},
		});
		harness.manager.select("hash-2");
		expect(lastUpdate(harness, "solutions")).toEqual([
			[["hash-1", 1, 1]],
			[["hash-2", 0, 0]],
		]);
	});
});

describe("nextRound", () => {
	test("throws without a challenge", () => {
		const harness = build();
		expect(() => harness.manager.nextRound()).toThrow();
	});

	test("throws on the last round", () => {
		const harness = build({
			initialState: { challenge: challengeResponse(), index: 0 },
		});
		expect(() => harness.manager.nextRound()).toThrow();
	});

	test("advances the index when another round remains", () => {
		const harness = build({
			initialState: {
				challenge: challengeResponse({ captchas: [captcha(), captcha()] }),
				index: 0,
			},
		});
		harness.manager.nextRound();
		expect(lastUpdate(harness, "index")).toBe(1);
	});
});

describe("cancel", () => {
	test("clears the timeout, resets and closes", async () => {
		const harness = build();
		await harness.manager.cancel();
		expect(harness.updates[0]).toEqual({ timeout: undefined });
		expect(harness.events.onReset).toHaveBeenCalledTimes(1);
		expect(harness.events.onClose).toHaveBeenCalledTimes(1);
		expect(harness.restart).toHaveBeenCalledTimes(1);
	});

	test("does not require a frictionless restart hook", async () => {
		const harness = build({ withFrictionless: false });
		await harness.manager.cancel();
		expect(harness.events.onClose).toHaveBeenCalledTimes(1);
	});
});

describe("reload", () => {
	test("restarts the frictionless flow instead of re-running start", async () => {
		const harness = build();
		await harness.manager.reload();
		expect(harness.events.onReload).toHaveBeenCalledTimes(1);
		expect(harness.restart).toHaveBeenCalledTimes(1);
		expect(mocks.getCaptchaChallenge).not.toHaveBeenCalled();
	});

	test("starts a fresh challenge when there is nothing to restart", async () => {
		const harness = build({ withFrictionless: false });
		await harness.manager.reload();
		expect(harness.events.onReload).toHaveBeenCalledTimes(1);
		expect(mocks.getCaptchaChallenge).toHaveBeenCalledTimes(1);
	});
});
