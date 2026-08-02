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

import type { FingerprintProof } from "@prosopo/fingerprint";
import type { pickIpMode } from "@prosopo/procaptcha-common";
import {
	ApiParams,
	type BehavioralData,
	CaptchaType,
	type ClickEventPoint,
	type ClientMetaData,
	type EnvironmentTypes,
	type FrictionlessState,
	type GetPowCaptchaResponse,
	type MouseMovementPoint,
	type PackedBehavioralData,
	type PowCaptchaSolutionResponse,
	type ProcaptchaCallbacks,
	type ProcaptchaClientConfigInput,
	type ProcaptchaEscalationHandler,
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
import { Manager } from "../services/Manager.js";

// Taken from procaptcha-common rather than @prosopo/load-balancer directly, so
// the test does not pull a dependency into this package that the source has no
// use for.
type IpMode = ReturnType<typeof pickIpMode>;

import {
	OTHER_PROVIDER_URL,
	PROVIDER_URL,
	SITE_KEY,
	USER_ADDRESS,
	account,
	accountWithoutExtension,
	callbacks,
	challengeResponse,
	config,
	frictionless,
	randomProvider,
	signRawMock,
	solutionResponse,
	state,
} from "./managerHarness.js";

/**
 * Everything the manager reaches out to is replaced here. The manager itself is
 * a closure over its collaborators rather than a class with injection points,
 * so the module boundary is the seam: each mock keeps the real export list
 * intact and swaps only the call the manager makes.
 */
const mocks = vi.hoisted(() => {
	const providerApiConstructions: { url: string; siteKey: string }[] = [];
	const getPowCaptchaChallenge =
		vi.fn<
			(
				user: string,
				dapp: string,
				sessionId?: string,
				simdReadings?: string,
			) => Promise<GetPowCaptchaResponse>
		>();
	const submitPowCaptchaSolution =
		vi.fn<
			(
				challenge: GetPowCaptchaResponse,
				userAccount: string,
				dappAccount: string,
				nonce: number,
				userTimestampSignature: string,
				behavioralData?: string,
				salt?: string,
				simdReadings?: string,
				clientMetaData?: ClientMetaData,
				fingerprintProof?: string,
			) => Promise<PowCaptchaSolutionResponse>
		>();

	class ProviderApiMock {
		public getPowCaptchaChallenge = getPowCaptchaChallenge;
		public submitPowCaptchaSolution = submitPowCaptchaSolution;
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
	const solvePoW =
		vi.fn<(data: string, difficulty: number) => Promise<number>>();
	const sleep = vi.fn<(ms: number) => Promise<void>>();
	const getFingerprintProof =
		vi.fn<(keys: readonly string[]) => Promise<FingerprintProof>>();
	const encodeFingerprintProof = vi.fn<(proof: FingerprintProof) => string>();

	return {
		providerApiConstructions,
		getPowCaptchaChallenge,
		submitPowCaptchaSolution,
		ProviderApiMock,
		getAccount,
		ExtensionMock,
		extensionLoader,
		getProcaptchaRandomActiveProvider,
		solvePoW,
		sleep,
		getFingerprintProof,
		encodeFingerprintProof,
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
	return { ...actual, solvePoW: mocks.solvePoW, sleep: mocks.sleep };
});

vi.mock("@prosopo/fingerprint", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@prosopo/fingerprint")>();
	return {
		...actual,
		getFingerprintProof: mocks.getFingerprintProof,
		encodeFingerprintProof: mocks.encodeFingerprintProof,
	};
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
	onEscalate: Mock<ProcaptchaEscalationHandler>;
	restart: Mock<() => void>;
}

interface HarnessOptions {
	configInput?: ProcaptchaClientConfigInput;
	initialState?: Partial<ProcaptchaState>;
	frictionlessState?: FrictionlessState;
	withFrictionless?: boolean;
	honeypot?: () => string | undefined;
	withEscalationHandler?: boolean;
}

const FINGERPRINT_PROOF: FingerprintProof = {
	v: 1,
	root: "0xroot",
	disclosures: [],
};

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
	const onEscalate = vi.fn<ProcaptchaEscalationHandler>();
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
		options.withEscalationHandler === false ? undefined : onEscalate,
		options.honeypot,
	);
	return {
		manager,
		state: currentState,
		updates,
		events,
		onEscalate,
		restart,
	};
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
): Parameters<typeof mocks.submitPowCaptchaSolution> => {
	const call = mocks.submitPowCaptchaSolution.mock.calls[callIndex];
	if (!call) throw new Error("expected a solution to have been submitted");
	return call;
};

const signRaw = signRawMock;

beforeEach(() => {
	vi.clearAllMocks();
	mocks.providerApiConstructions.length = 0;
	signRaw.mockResolvedValue({ id: 1, signature: "0xuser-signature" });
	mocks.getAccount.mockResolvedValue(account(signRaw));
	mocks.extensionLoader.mockResolvedValue(mocks.ExtensionMock);
	mocks.getProcaptchaRandomActiveProvider.mockResolvedValue(randomProvider());
	mocks.getPowCaptchaChallenge.mockResolvedValue(challengeResponse());
	mocks.submitPowCaptchaSolution.mockResolvedValue(solutionResponse());
	mocks.solvePoW.mockResolvedValue(42);
	mocks.sleep.mockResolvedValue(undefined);
	mocks.getFingerprintProof.mockResolvedValue(FINGERPRINT_PROOF);
	mocks.encodeFingerprintProof.mockReturnValue("encoded-proof");
	// providerRetry reports every failure it swallows; the suite drives those
	// paths deliberately and the output would bury the real failures.
	vi.spyOn(console, "error").mockImplementation(() => undefined);
	vi.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
	vi.useRealTimers();
	Reflect.deleteProperty(globalThis, "__prosopoFingerprintProofTest__");
	vi.restoreAllMocks();
});

describe("start: the cases it refuses to run", () => {
	test("a solve already in flight is left alone", () => {
		const harness = build({ initialState: { loading: true } });
		return harness.manager.start().then(() => {
			expect(mocks.getPowCaptchaChallenge).not.toHaveBeenCalled();
			expect(harness.updates).toHaveLength(0);
		});
	});

	test("a user already proven human is not asked again", async () => {
		const harness = build({ initialState: { isHuman: true } });
		await harness.manager.start();
		expect(mocks.getPowCaptchaChallenge).not.toHaveBeenCalled();
		expect(harness.events.onHuman).not.toHaveBeenCalled();
	});
});

describe("start: getting to a challenge", () => {
	test("resets the widget before it starts, so a stale challenge cannot linger", async () => {
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
		// and it happens before the widget announces it is working
		expect(resetAt).toBeLessThan(
			harness.updates.findIndex((update) => update.loading === true),
		);
		expect(harness.events.onReset).toHaveBeenCalled();
	});

	test("the pre-start reset does not restart the frictionless session", async () => {
		// A restart here would tear down the session the challenge is about to be
		// requested against.
		const harness = build();
		await harness.manager.start();
		expect(harness.restart).not.toHaveBeenCalled();
	});

	test("marks the widget as loading and counts the attempt", async () => {
		const harness = build();
		await harness.manager.start();
		expect(harness.updates).toContainEqual({ loading: true });
		expect(harness.updates).toContainEqual({ attemptCount: 1 });
	});

	test("takes the account from the frictionless state when there is one", async () => {
		const harness = build();
		await harness.manager.start();
		expect(mocks.extensionLoader).not.toHaveBeenCalled();
		expect(lastUpdate(harness, "account")).toEqual({
			account: { address: USER_ADDRESS },
		});
	});

	test("without a frictionless state it loads an extension for the configured mode", async () => {
		const harness = build({ withFrictionless: false });
		await harness.manager.start();
		expect(mocks.extensionLoader).toHaveBeenCalledWith(true);
		expect(mocks.getAccount).toHaveBeenCalledTimes(1);
	});

	test("a web3 config loads the web3 extension", async () => {
		const harness = build({
			withFrictionless: false,
			configInput: config({ web2: false, userAccountAddress: USER_ADDRESS }),
		});
		await harness.manager.start();
		expect(mocks.extensionLoader).toHaveBeenCalledWith(false);
	});

	test("snapshots the site key into the state", async () => {
		const harness = build();
		await harness.manager.start();
		expect(harness.updates).toContainEqual({ dappAccount: SITE_KEY });
	});

	test("lets the UI catch up with the loading flag before the network work", async () => {
		const harness = build();
		await harness.manager.start();
		expect(mocks.sleep).toHaveBeenCalledWith(100);
	});

	test("web3 without an account address never reaches a provider", async () => {
		const harness = build({
			withFrictionless: false,
			configInput: config({ web2: false }),
		});
		await harness.manager.start();
		expect(mocks.getPowCaptchaChallenge).not.toHaveBeenCalled();
	});

	test("a missing site key stops the solve rather than talking to a provider anonymously", async () => {
		const harness = build({ configInput: config({ account: {} }) });
		await harness.manager.start();
		expect(mocks.getPowCaptchaChallenge).not.toHaveBeenCalled();
	});
});

describe("start: choosing a provider", () => {
	test("uses the provider the frictionless session already picked", async () => {
		const harness = build();
		await harness.manager.start();
		expect(mocks.getProcaptchaRandomActiveProvider).not.toHaveBeenCalled();
		expect(mocks.providerApiConstructions).toEqual([
			{ url: PROVIDER_URL, siteKey: SITE_KEY },
		]);
	});

	test("otherwise selects one for the configured environment", async () => {
		const harness = build({ withFrictionless: false });
		await harness.manager.start();
		expect(mocks.getProcaptchaRandomActiveProvider).toHaveBeenCalledWith(
			"production",
			undefined,
			{ attempt: 1, excludeUrl: undefined },
		);
	});

	test("passes the ipv4 preference through to selection", async () => {
		const harness = build({
			withFrictionless: false,
			configInput: config({ ipv4: true }),
		});
		await harness.manager.start();
		expect(mocks.getProcaptchaRandomActiveProvider).toHaveBeenCalledWith(
			"production",
			"ipv4",
			expect.anything(),
		);
	});

	test("passes the ipv6 preference through to selection", async () => {
		const harness = build({
			withFrictionless: false,
			configInput: config({ ipv6: true }),
		});
		await harness.manager.start();
		expect(mocks.getProcaptchaRandomActiveProvider).toHaveBeenCalledWith(
			"production",
			"ipv6",
			expect.anything(),
		);
	});

	test("excludes the provider that just failed from the retry", async () => {
		// Retrying against the provider that errored is the one choice guaranteed
		// not to help.
		const harness = build({ withFrictionless: false });
		mocks.getProcaptchaRandomActiveProvider
			.mockResolvedValueOnce(randomProvider())
			.mockResolvedValueOnce(randomProvider(OTHER_PROVIDER_URL));
		mocks.getPowCaptchaChallenge
			.mockRejectedValueOnce(new Error("provider down"))
			.mockResolvedValue(challengeResponse());
		await harness.manager.start();
		expect(mocks.getProcaptchaRandomActiveProvider.mock.calls[1]?.[2]).toEqual({
			// the second attempt, so selection falls back to the provider list
			attempt: 2,
			excludeUrl: PROVIDER_URL,
		});
	});
});

describe("start: the challenge request", () => {
	test("identifies the user, the site and the session", async () => {
		const harness = build({
			frictionlessState: frictionless({ sessionId: "session-1" }),
		});
		await harness.manager.start();
		expect(mocks.getPowCaptchaChallenge).toHaveBeenCalledWith(
			USER_ADDRESS,
			SITE_KEY,
			"session-1",
			undefined,
		);
	});

	test("attaches SIMD readings only if they have already resolved", async () => {
		// timeoutMs of 0 means "whatever is ready now" — waiting here would delay
		// the challenge for a signal that has later attach points anyway.
		const getSimdReadings = vi.fn<(ms?: number) => Promise<string | undefined>>(
			async () => "readings",
		);
		const harness = build({
			frictionlessState: frictionless({ getSimdReadings }),
		});
		await harness.manager.start();
		expect(getSimdReadings).toHaveBeenCalledWith(0);
		expect(mocks.getPowCaptchaChallenge.mock.calls[0]?.[3]).toBe("readings");
	});

	test("a session without a readings source simply omits them", async () => {
		const harness = build();
		await harness.manager.start();
		expect(mocks.getPowCaptchaChallenge.mock.calls[0]?.[3]).toBeUndefined();
	});

	test("an error in the response is surfaced and the solve stops", async () => {
		const harness = build();
		mocks.getPowCaptchaChallenge.mockResolvedValue(
			challengeResponse({
				error: {
					message: "no session",
					key: "CAPTCHA.NO_SESSION_FOUND",
					code: 400,
				},
			}),
		);
		await harness.manager.start();
		expect(lastUpdate(harness, "error")).toEqual({
			message: "no session",
			key: "CAPTCHA.NO_SESSION_FOUND",
		});
		expect(lastUpdate(harness, "loading")).toBe(false);
		expect(mocks.solvePoW).not.toHaveBeenCalled();
		expect(mocks.submitPowCaptchaSolution).not.toHaveBeenCalled();
		expect(harness.events.onFailed).not.toHaveBeenCalled();
		expect(harness.events.onHuman).not.toHaveBeenCalled();
	});

	test("an error with no key is still reported under a known key", async () => {
		// The widget switches on the key; an undefined one would fall through
		// every branch that handles a specific failure.
		const harness = build();
		mocks.getPowCaptchaChallenge.mockResolvedValue(
			challengeResponse({ error: { message: "boom", code: 500 } }),
		);
		await harness.manager.start();
		expect(lastUpdate(harness, "error")).toEqual({
			message: "boom",
			key: "API.UNKNOWN_ERROR",
		});
	});
});

describe("start: solving and signing", () => {
	test("solves the challenge the provider issued at its difficulty", async () => {
		const harness = build();
		await harness.manager.start();
		expect(mocks.solvePoW).toHaveBeenCalledWith(
			challengeResponse().challenge,
			2,
		);
	});

	test("embeds the click coordinates in the salt", async () => {
		const harness = build();
		await harness.manager.start(120, 45);
		const salt = submitArgs()[6];
		expect(salt).toBeDefined();
		expect(extractData(String(salt))).toEqual([120, 45]);
	});

	test("a solve with no click still carries a salt, of the origin", async () => {
		const harness = build();
		await harness.manager.start();
		expect(extractData(String(submitArgs()[6]))).toEqual([0, 0]);
	});

	test("signs the challenge timestamp as the user", async () => {
		const harness = build();
		await harness.manager.start();
		expect(signRaw).toHaveBeenCalledWith({
			address: USER_ADDRESS,
			// stringToHex of the challenge timestamp
			data: "0x31373030303030303030303030",
			type: "bytes",
		});
		expect(submitArgs()[4]).toBe("0xuser-signature");
	});

	test("an account with no extension cannot prove ownership, so nothing is submitted", async () => {
		const harness = build({
			frictionlessState: frictionless({
				userAccount: accountWithoutExtension(),
			}),
		});
		await harness.manager.start();
		expect(mocks.submitPowCaptchaSolution).not.toHaveBeenCalled();
	});

	test("an extension that cannot sign raw data is treated the same way", async () => {
		const harness = build({
			frictionlessState: frictionless({ userAccount: account(undefined) }),
		});
		await harness.manager.start();
		expect(mocks.submitPowCaptchaSolution).not.toHaveBeenCalled();
	});
});

describe("start: behavioural data", () => {
	// The three collectors differ only in the point type they hand back, so
	// each fixture builds the same stub around its own `getData`.
	const collectorOf = <T>(
		getData: () => T[],
	): {
		start: () => void;
		stop: () => void;
		clear: () => void;
		getData: () => T[];
	} => ({
		start: () => undefined,
		stop: () => undefined,
		clear: () => undefined,
		getData,
	});

	const collector = (points: [number, number][]) =>
		collectorOf<MouseMovementPoint>(() =>
			points.map(([x, y]) => ({ x, y, timestamp: 0 })),
		);

	const touchCollector = (points: [number, number][]) =>
		collectorOf<TouchEventPoint>(() =>
			points.map(([x, y]) => ({
				x,
				y,
				timestamp: 0,
				eventType: "touchstart" as const,
				touchCount: 1,
			})),
		);

	const clickCollector = (points: [number, number][]) =>
		collectorOf<ClickEventPoint>(() =>
			points.map(([x, y]) => ({
				x,
				y,
				timestamp: 0,
				eventType: "click" as const,
				button: 0,
			})),
		);

	test("is encrypted and submitted when a collector and a cipher are present", async () => {
		const encryptBehavioralData = vi.fn<(data: string) => Promise<string>>(
			async () => "cipher",
		);
		const harness = build({
			frictionlessState: frictionless({
				encryptBehavioralData,
				behaviorCollector1: collector([[1, 2]]),
				deviceCapability: "high",
			}),
		});
		await harness.manager.start();
		const payload: unknown = JSON.parse(
			encryptBehavioralData.mock.calls[0]?.[0] ?? "null",
		);
		expect(payload).toMatchObject({
			collector1: [{ x: 1, y: 2, timestamp: 0 }],
			collector2: [],
			collector3: [],
			deviceCapability: "high",
		});
		expect(submitArgs()[5]).toBe("cipher");
	});

	test("a session that never reported a device capability is labelled unknown", async () => {
		const encryptBehavioralData = vi.fn<(data: string) => Promise<string>>(
			async () => "cipher",
		);
		const harness = build({
			frictionlessState: frictionless({
				encryptBehavioralData,
				behaviorCollector3: clickCollector([]),
			}),
		});
		await harness.manager.start();
		expect(
			JSON.parse(encryptBehavioralData.mock.calls[0]?.[0] ?? "null"),
		).toMatchObject({ deviceCapability: "unknown" });
	});

	test("is packed first when the session knows how to pack it", async () => {
		const encryptBehavioralData = vi.fn<(data: string) => Promise<string>>(
			async () => "cipher",
		);
		const packBehavioralData = vi.fn<
			(data: BehavioralData) => PackedBehavioralData
		>(() => ({ c1: [], c2: [], c3: [], d: "packed" }));
		const harness = build({
			frictionlessState: frictionless({
				encryptBehavioralData,
				packBehavioralData,
				behaviorCollector2: touchCollector([[3, 4]]),
			}),
		});
		await harness.manager.start();
		expect(packBehavioralData).toHaveBeenCalledTimes(1);
		expect(encryptBehavioralData).toHaveBeenCalledWith(
			JSON.stringify({ c1: [], c2: [], c3: [], d: "packed" }),
		);
	});

	test("no collector means nothing is collected, even with a cipher available", async () => {
		const encryptBehavioralData = vi.fn<(data: string) => Promise<string>>(
			async () => "cipher",
		);
		const harness = build({
			frictionlessState: frictionless({ encryptBehavioralData }),
		});
		await harness.manager.start();
		expect(encryptBehavioralData).not.toHaveBeenCalled();
		expect(submitArgs()[5]).toBeUndefined();
	});

	test("no cipher means the collectors are not even read", async () => {
		const behaviorCollector1 = collector([[1, 1]]);
		const getData = vi.spyOn(behaviorCollector1, "getData");
		const harness = build({
			frictionlessState: frictionless({ behaviorCollector1 }),
		});
		await harness.manager.start();
		expect(getData).not.toHaveBeenCalled();
		expect(submitArgs()[5]).toBeUndefined();
	});

	test("a failure to encrypt does not cost the user their solve", async () => {
		// Behavioural data is an analytics signal; losing it must not turn a
		// solved captcha into a failed one.
		const harness = build({
			frictionlessState: frictionless({
				encryptBehavioralData: async () => {
					throw new Error("no key");
				},
				behaviorCollector1: collector([[1, 2]]),
			}),
		});
		await harness.manager.start();
		expect(submitArgs()[5]).toBeUndefined();
		expect(harness.events.onHuman).toHaveBeenCalledTimes(1);
	});

	test("a collector that throws is handled the same way", async () => {
		const harness = build({
			frictionlessState: frictionless({
				encryptBehavioralData: async () => "cipher",
				behaviorCollector1: {
					start: () => undefined,
					stop: () => undefined,
					clear: () => undefined,
					getData: () => {
						throw new Error("detached");
					},
				},
			}),
		});
		await harness.manager.start();
		expect(submitArgs()[5]).toBeUndefined();
		expect(harness.events.onHuman).toHaveBeenCalledTimes(1);
	});
});

describe("start: the rest of the submission", () => {
	test("waits for SIMD readings before submitting", async () => {
		const getSimdReadings = vi.fn<(ms?: number) => Promise<string | undefined>>(
			async (ms?: number) => (ms === 0 ? undefined : "late-readings"),
		);
		const harness = build({
			frictionlessState: frictionless({ getSimdReadings }),
		});
		await harness.manager.start();
		expect(submitArgs()[7]).toBe("late-readings");
	});

	test("a filled honeypot is reported with the solution", async () => {
		const harness = build({ honeypot: () => "bot@example.com" });
		await harness.manager.start();
		expect(submitArgs()[8]).toEqual({ hp: "bot@example.com" });
	});

	test("an untouched honeypot adds nothing to the payload", async () => {
		const harness = build({ honeypot: () => "" });
		await harness.manager.start();
		expect(submitArgs()[8]).toBeUndefined();
	});

	test("no honeypot reader at all is fine", async () => {
		const harness = build();
		await harness.manager.start();
		expect(submitArgs()[8]).toBeUndefined();
	});

	test("discloses only the keys the validator checks", async () => {
		const harness = build();
		await harness.manager.start();
		expect(mocks.getFingerprintProof).toHaveBeenCalledTimes(1);
		expect(submitArgs()[9]).toBe("encoded-proof");
	});

	test("an unavailable fingerprint does not block the submission", async () => {
		const harness = build();
		mocks.getFingerprintProof.mockRejectedValue(new Error("unavailable"));
		await harness.manager.start();
		expect(submitArgs()[9]).toBeUndefined();
		expect(harness.events.onHuman).toHaveBeenCalledTimes(1);
	});

	test("a proof that cannot be encoded is dropped rather than raised", async () => {
		const harness = build();
		mocks.encodeFingerprintProof.mockImplementation(() => {
			throw new Error("bad proof");
		});
		await harness.manager.start();
		expect(submitArgs()[9]).toBeUndefined();
	});

	test("the test hook can omit the proof", async () => {
		const harness = build();
		Reflect.set(globalThis, "__prosopoFingerprintProofTest__", "omit");
		await harness.manager.start();
		expect(submitArgs()[9]).toBeUndefined();
	});

	test("the test hook can send a proof the provider will reject", async () => {
		const harness = build();
		Reflect.set(globalThis, "__prosopoFingerprintProofTest__", "malformed");
		await harness.manager.start();
		expect(submitArgs()[9]).toBe("invalid-fingerprint-proof");
	});

	test("an empty hook value leaves the real proof alone", async () => {
		const harness = build();
		Reflect.set(globalThis, "__prosopoFingerprintProofTest__", "");
		await harness.manager.start();
		expect(submitArgs()[9]).toBe("encoded-proof");
	});

	test("a hook value that is not a string leaves the real proof alone", async () => {
		const harness = build();
		Reflect.set(globalThis, "__prosopoFingerprintProofTest__", 1);
		await harness.manager.start();
		expect(submitArgs()[9]).toBe("encoded-proof");
	});

	test("submits the challenge, the solver's nonce and both accounts", async () => {
		const harness = build();
		await harness.manager.start();
		const [challenge, user, dapp, nonce] = submitArgs();
		expect(challenge).toEqual(challengeResponse());
		expect(user).toBe(USER_ADDRESS);
		expect(dapp).toBe(SITE_KEY);
		expect(nonce).toBe(42);
	});
});

describe("start: what the provider decides", () => {
	test("a verified solution makes the user human and issues a token", async () => {
		const harness = build();
		await harness.manager.start();
		expect(lastUpdate(harness, "isHuman")).toBe(true);
		expect(lastUpdate(harness, "loading")).toBe(false);
		const token = harness.events.onHuman.mock.calls[0]?.[0];
		expect(token).toBeDefined();
		const output = decodeProcaptchaOutput(String(token));
		expect(output).toMatchObject({
			[ApiParams.providerUrl]: PROVIDER_URL,
			[ApiParams.user]: USER_ADDRESS,
			[ApiParams.dapp]: SITE_KEY,
			[ApiParams.challenge]: challengeResponse().challenge,
			[ApiParams.nonce]: 42,
			[ApiParams.timestamp]: challengeResponse().timestamp,
			[ApiParams.captchaType]: CaptchaType.pow,
		});
		expect(harness.events.onFailed).not.toHaveBeenCalled();
	});

	test("the token carries both signatures the provider will need to verify it", async () => {
		const harness = build();
		await harness.manager.start();
		const output = decodeProcaptchaOutput(
			String(harness.events.onHuman.mock.calls[0]?.[0]),
		);
		expect(output[ApiParams.signature]).toEqual({
			[ApiParams.provider]: { [ApiParams.challenge]: "0xprovider-challenge" },
			[ApiParams.user]: { [ApiParams.timestamp]: "0xuser-signature" },
		});
	});

	test("the human state expires, and the widget goes back to the start", async () => {
		vi.useFakeTimers();
		const harness = build();
		await harness.manager.start();
		expect(lastUpdate(harness, "successfullChallengeTimeout")).toBeDefined();
		harness.events.onReset.mockClear();
		vi.runOnlyPendingTimers();
		expect(harness.events.onExpired).toHaveBeenCalledTimes(1);
		expect(lastUpdate(harness, "isHuman")).toBe(false);
		expect(harness.events.onReset).toHaveBeenCalledTimes(1);
		expect(harness.restart).toHaveBeenCalledTimes(1);
	});

	test("an unverified solution fails the user and resets the session", async () => {
		const harness = build();
		mocks.submitPowCaptchaSolution.mockResolvedValue(
			solutionResponse({ verified: false }),
		);
		await harness.manager.start();
		expect(harness.events.onFailed).toHaveBeenCalledTimes(1);
		expect(lastUpdate(harness, "isHuman")).toBe(false);
		expect(lastUpdate(harness, "loading")).toBe(false);
		expect(harness.restart).toHaveBeenCalledTimes(1);
		expect(harness.events.onHuman).not.toHaveBeenCalled();
	});

	test("an escalation hands over without declaring success or failure", async () => {
		const harness = build();
		mocks.submitPowCaptchaSolution.mockResolvedValue(
			solutionResponse({
				verified: true,
				escalation: {
					[ApiParams.captchaType]: CaptchaType.image,
					[ApiParams.sessionId]: "escalated-session",
				},
			}),
		);
		await harness.manager.start(10, 20);
		expect(harness.onEscalate).toHaveBeenCalledWith(
			CaptchaType.image,
			"escalated-session",
			{ x: 10, y: 20 },
		);
		expect(harness.events.onHuman).not.toHaveBeenCalled();
		expect(harness.events.onFailed).not.toHaveBeenCalled();
		expect(lastUpdate(harness, "loading")).toBe(false);
	});

	test("a puzzle escalation is handed over the same way", async () => {
		const harness = build();
		mocks.submitPowCaptchaSolution.mockResolvedValue(
			solutionResponse({
				verified: false,
				escalation: {
					[ApiParams.captchaType]: CaptchaType.puzzle,
					[ApiParams.sessionId]: "escalated-session",
				},
			}),
		);
		await harness.manager.start(0, 7);
		expect(harness.onEscalate).toHaveBeenCalledWith(
			CaptchaType.puzzle,
			"escalated-session",
			{ x: 0, y: 7 },
		);
		expect(harness.events.onFailed).not.toHaveBeenCalled();
	});

	test("an escalation with no real click forwards no coordinates", async () => {
		// (0, 0) is what an autoStart or an untrusted event produces; passing it
		// on would seed the next widget's salt with a click that never happened.
		const harness = build();
		mocks.submitPowCaptchaSolution.mockResolvedValue(
			solutionResponse({
				escalation: {
					[ApiParams.captchaType]: CaptchaType.image,
					[ApiParams.sessionId]: "escalated-session",
				},
			}),
		);
		await harness.manager.start();
		expect(harness.onEscalate).toHaveBeenCalledWith(
			CaptchaType.image,
			"escalated-session",
			undefined,
		);
	});

	test("an escalation nobody is listening for does not throw", async () => {
		const harness = build({ withEscalationHandler: false });
		mocks.submitPowCaptchaSolution.mockResolvedValue(
			solutionResponse({
				escalation: {
					[ApiParams.captchaType]: CaptchaType.image,
					[ApiParams.sessionId]: "escalated-session",
				},
			}),
		);
		await expect(harness.manager.start()).resolves.toBeUndefined();
	});
});

describe("start: retrying a failed provider", () => {
	test("a failure is retried against a fresh provider", async () => {
		const harness = build({ withFrictionless: false });
		mocks.getPowCaptchaChallenge
			.mockRejectedValueOnce(new Error("provider down"))
			.mockResolvedValue(challengeResponse());
		await harness.manager.start();
		expect(mocks.getPowCaptchaChallenge).toHaveBeenCalledTimes(2);
		expect(harness.events.onHuman).toHaveBeenCalledTimes(1);
	});

	test("the retry keeps the coordinates of the original click", async () => {
		// Losing them mid-retry means an eventual escalation seeds the image
		// widget's salt with a click at the origin instead of the real one.
		const harness = build({ withFrictionless: false });
		mocks.getPowCaptchaChallenge
			.mockRejectedValueOnce(new Error("provider down"))
			.mockResolvedValue(challengeResponse());
		mocks.submitPowCaptchaSolution.mockResolvedValue(
			solutionResponse({
				escalation: {
					[ApiParams.captchaType]: CaptchaType.image,
					[ApiParams.sessionId]: "escalated-session",
				},
			}),
		);
		await harness.manager.start(33, 44);
		expect(harness.onEscalate).toHaveBeenCalledWith(
			CaptchaType.image,
			"escalated-session",
			{ x: 33, y: 44 },
		);
	});

	test("a widget that has already used its attempts gives up instead of looping", async () => {
		const harness = build({
			withFrictionless: false,
			initialState: { attemptCount: 3 },
		});
		mocks.getPowCaptchaChallenge.mockRejectedValue(new Error("provider down"));
		await harness.manager.start();
		expect(mocks.getPowCaptchaChallenge).toHaveBeenCalledTimes(1);
		expect(harness.events.onReset).toHaveBeenCalled();
	});

	test("a failure in the middle of a solve still resets the widget", async () => {
		const harness = build({
			withFrictionless: false,
			initialState: { attemptCount: 3 },
		});
		mocks.submitPowCaptchaSolution.mockRejectedValue(new Error("500"));
		await harness.manager.start();
		expect(harness.events.onHuman).not.toHaveBeenCalled();
		expect(harness.events.onReset).toHaveBeenCalled();
	});
});

describe("the account the config ends up carrying", () => {
	test("an account picked mid-solve wins over the one the page was configured with", async () => {
		// The user can switch accounts in their extension between the click and
		// the submission; the solve must belong to the account that signed it.
		const harness = build({
			configInput: config({ userAccountAddress: "stale-address" }),
		});
		await harness.manager.start();
		expect(mocks.getPowCaptchaChallenge.mock.calls[0]?.[0]).toBe(USER_ADDRESS);
	});
});

describe("resetState", () => {
	test("clears both timers and tells the page the widget was reset", () => {
		const harness = build({
			initialState: {
				timeout: setTimeout(() => undefined, 1000),
				successfullChallengeTimeout: setTimeout(() => undefined, 1000),
			},
		});
		const clear = vi.spyOn(window, "clearTimeout");
		harness.manager.resetState();
		expect(clear).toHaveBeenCalledTimes(2);
		expect(harness.updates).toContainEqual({ timeout: undefined });
		expect(harness.updates).toContainEqual({
			successfullChallengeTimeout: undefined,
		});
		expect(harness.events.onReset).toHaveBeenCalledTimes(1);
	});

	test("restarts the frictionless session only when asked to", () => {
		const harness = build();
		harness.manager.resetState();
		expect(harness.restart).not.toHaveBeenCalled();
		harness.manager.resetState(harness.restart);
		expect(harness.restart).toHaveBeenCalledTimes(1);
	});

	test("puts every field back to its default", () => {
		const harness = build({
			initialState: { index: 4, isHuman: true, showModal: true },
		});
		harness.manager.resetState();
		expect(harness.state).toMatchObject({
			showModal: false,
			loading: false,
			index: 0,
			isHuman: false,
			challenge: undefined,
			account: undefined,
		});
	});
});
