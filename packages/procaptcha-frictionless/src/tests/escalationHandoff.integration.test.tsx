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

/**
 * Post-PoW escalation, end to end on the client: the real
 * ProcaptchaFrictionless wrapper hands off to the real image widget and its
 * real Manager. Only the network is stubbed, and the stub enforces the
 * provider's actual contract — `checkAndRemoveSession` consumes a session the
 * moment it issues a challenge, so a second `/captcha/image` on the same
 * sessionId is answered with 400 CAPTCHA.NO_SESSION_FOUND.
 *
 * Observed in production on provider 3.8.5:
 *
 *   11:27:49.910  POST /pow/solution        200  escalation envelope returned
 *   11:27:50.263  POST /captcha/image       200  escalation session issued
 *   11:27:55.030  POST /captcha/image       400  CAPTCHA.NO_SESSION_FOUND, same session
 *
 * The PoW manager fires `onEscalate` from inside its `providerRetry`-wrapped
 * `submit()`, so a throw after the handoff re-runs submit and escalates a
 * second time on the same envelope.
 */

import type { Ti18n } from "@prosopo/locale";
import {
	type Account,
	ApiParams,
	type BotDetectionFunction,
	type CaptchaResponseBody,
	CaptchaType,
	ModeEnum,
	type ProcaptchaClientConfigInput,
	type ProcaptchaProps,
	type RandomProvider,
} from "@prosopo/types";
import { type ReactElement, act, createElement } from "react";
import { type Root, createRoot } from "react-dom/client";
import {
	type Mock,
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

declare global {
	var IS_REACT_ACT_ENVIRONMENT: boolean;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const ESCALATION_SESSION_ID = "provider-session-escalated";
const FIRST_SESSION_ID = "provider-session-1";

// The provider's one-shot session contract, as a stub: the first challenge
// fetch for a sessionId succeeds, every later one fails the way
// `checkAndRemoveSession` makes it fail.
const mocks = vi.hoisted(() => {
	const challengeRequests: (string | undefined)[] = [];
	const consumed = new Set<string>();

	const body = (): CaptchaResponseBody => ({
		captchas: [
			{
				captchaId: "captcha-id-1",
				captchaContentId: "captcha-content-id-1",
				datasetId: "dataset-id",
				salt: "0xsalt",
				target: "cars",
				items: [],
			},
		],
		requestHash: "0xrequest-hash",
		timestamp: "1700000000000",
		signature: { provider: { requestHash: "0xprovider-request-hash" } },
		status: "ok",
	});

	const getCaptchaChallenge = async (
		_userAccount: string,
		_provider: unknown,
		sessionId?: string,
	): Promise<CaptchaResponseBody> => {
		challengeRequests.push(sessionId);
		if (sessionId && consumed.has(sessionId)) {
			// A 400 carrying a JSON body is *returned*, not thrown —
			// HttpClientBase only throws when the failure isn't JSON. This is
			// the envelope the provider's ProsopoApiError serialises to, and
			// `error.key` is what the widget's recovery path keys off.
			return {
				...body(),
				captchas: [],
				error: {
					key: "CAPTCHA.NO_SESSION_FOUND",
					message: "No session found",
					code: 400,
				},
			};
		}
		if (sessionId) consumed.add(sessionId);
		return body();
	};

	class ProviderApiMock {
		public getCaptchaChallenge = getCaptchaChallenge;
	}

	return { challengeRequests, consumed, ProviderApiMock };
});

vi.mock("@prosopo/api", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@prosopo/api")>();
	return { ...actual, ProviderApi: mocks.ProviderApiMock };
});

// The image Manager constructs an extension before it can ask for a challenge
// (it then reads the account off the frictionless state, and nothing in this
// flow signs anything). `ExtensionLoader` resolves to the class, so the mock
// has to as well.
class ExtensionMock {
	public getAccount = async (): Promise<Account> => ({
		account: { address: "user-address" },
	});
}

vi.mock("@prosopo/procaptcha-common", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@prosopo/procaptcha-common")>();
	return {
		...actual,
		isSecureBrowserContext: () => true,
		ExtensionLoader: async (_web2: boolean) => ExtensionMock,
	};
});

vi.mock("@prosopo/locale", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@prosopo/locale")>();
	return {
		...actual,
		useTranslation: () => ({ t: (key: string) => key, ready: true }),
		loadI18next: async () => undefined,
	};
});

// The PoW widget is the escalation *source*, so it stays a stub — the test
// drives its `onEscalate` callback directly. The image widget below it is real.
const powMounts: { props: ProcaptchaProps }[] = [];
vi.mock("@prosopo/procaptcha-pow", () => ({
	ProcaptchaPow: (props: ProcaptchaProps) => {
		powMounts.push({ props });
		return createElement("div", { "data-widget": "pow" });
	},
}));
vi.mock("@prosopo/procaptcha-puzzle", () => ({
	ProcaptchaPuzzle: () => createElement("div", { "data-widget": "puzzle" }),
}));

const { ProcaptchaFrictionless } = await import("../ProcaptchaFrictionless.js");

const provider: RandomProvider = {
	providerAccount: "provider-account",
	provider: { url: "https://provider.test" },
};

const userAccount: Account = { account: { address: "user-address" } };

const config = (): ProcaptchaClientConfigInput => ({
	account: { address: "5siteKey" },
	userAccountAddress: "",
	web2: true,
	mode: ModeEnum.visible,
});

const i18nStub = {
	isInitialized: true,
	language: "en",
	t: (key: string) => key,
	changeLanguage: vi.fn(),
} as unknown as Ti18n;

const detectBot: Mock<BotDetectionFunction> = vi.fn(async () => ({
	captchaType: CaptchaType.pow,
	sessionId: FIRST_SESSION_ID,
	status: "ok",
	provider,
	userAccount,
}));

let container: HTMLDivElement;
let root: Root;

const lastPowMount = () => {
	const mount = powMounts.at(-1);
	if (!mount) throw new Error("expected the pow widget to have mounted");
	return mount;
};

/**
 * Flush React work until the challenge traffic has been quiet for four
 * consecutive polls, so the negative assertions know nothing further is on its
 * way. Paired with `waitForChallenge` below rather than used alone: starting
 * from an already-quiet count, a pure quiescence check can declare "settled"
 * before a request that is still coming has been issued.
 */
const settle = async (): Promise<void> => {
	let quiet = 0;
	let previous = mocks.challengeRequests.length;
	for (let poll = 0; poll < 40 && quiet < 4; poll++) {
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 60));
		});
		const current = mocks.challengeRequests.length;
		quiet = current === previous ? quiet + 1 : 0;
		previous = current;
	}
};

const challengeRequestCount = (sessionId: string): number =>
	mocks.challengeRequests.filter((id) => id === sessionId).length;

/** Flush until the image Manager has issued its challenge fetch. */
const waitForChallenge = async (sessionId: string): Promise<void> => {
	for (
		let poll = 0;
		poll < 60 && challengeRequestCount(sessionId) === 0;
		poll++
	) {
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 50));
		});
	}
};

/**
 * The PoW solution came back with an escalation envelope. `expectRequest`
 * distinguishes a handoff that should reach the network from one the wrapper
 * is expected to swallow — waiting for the request in the first case is what
 * keeps a late fetch from leaking into the next assertion.
 */
const escalate = async (
	sessionId: string,
	expectRequest = true,
): Promise<void> => {
	const { onEscalate } = lastPowMount().props;
	await act(async () => {
		onEscalate?.(CaptchaType.image, sessionId, { x: 120, y: 340 });
	});
	if (expectRequest) await waitForChallenge(sessionId);
	await settle();
};

beforeEach(async () => {
	powMounts.length = 0;
	mocks.challengeRequests.length = 0;
	mocks.consumed.clear();
	detectBot.mockClear();
	container = document.createElement("div");
	document.body.appendChild(container);
	act(() => {
		root = createRoot(container);
	});
	await act(async () => {
		root.render(
			createElement(ProcaptchaFrictionless, {
				config: config(),
				callbacks: {},
				restart: vi.fn<() => void>(),
				i18n: i18nStub,
				detectBot,
			}) as ReactElement,
		);
	});
});

afterEach(() => {
	act(() => {
		root.unmount();
	});
	container.remove();
	vi.clearAllMocks();
});

describe("post-PoW escalation handoff", () => {
	it("fetches the image challenge exactly once for the escalation session", async () => {
		await escalate(ESCALATION_SESSION_ID);

		expect(challengeRequestCount(ESCALATION_SESSION_ID)).toBe(1);
	});

	it("does not re-request the challenge when the same escalation fires twice", async () => {
		// The PoW manager escalates from inside providerRetry, so a retried
		// submit() replays the same envelope. Before the guard this mounted a
		// second image widget against a session the first one had already
		// spent, and the provider answered 400 CAPTCHA.NO_SESSION_FOUND.
		await escalate(ESCALATION_SESSION_ID);
		await escalate(ESCALATION_SESSION_ID, false);

		expect(challengeRequestCount(ESCALATION_SESSION_ID)).toBe(1);
	});

	it("still follows a genuinely new escalation session", async () => {
		await escalate(ESCALATION_SESSION_ID);
		await escalate("provider-session-escalated-2");

		expect(challengeRequestCount(ESCALATION_SESSION_ID)).toBe(1);
		expect(challengeRequestCount("provider-session-escalated-2")).toBe(1);
	});

	it("recovers rather than stranding the user when the escalation session is already gone", async () => {
		// Something else consumed the escalation session first (a duplicate
		// POST from a mount storm). The wrapper must re-mint via /frictionless
		// rather than leaving a dead "No session found" checkbox.
		mocks.consumed.add(ESCALATION_SESSION_ID);
		const detectBotCallsBefore = detectBot.mock.calls.length;

		await escalate(ESCALATION_SESSION_ID);

		expect(challengeRequestCount(ESCALATION_SESSION_ID)).toBe(1);
		expect(detectBot.mock.calls.length).toBeGreaterThan(detectBotCallsBefore);
	});
});

describe("the one-shot session contract this suite stubs", () => {
	it("issues a challenge on the first fetch", async () => {
		const api = new mocks.ProviderApiMock();

		const challenge = await api.getCaptchaChallenge("user", provider, "fresh");

		expect(challenge[ApiParams.captchas]).toHaveLength(1);
		expect(challenge[ApiParams.error]).toBeUndefined();
	});

	it("matches the provider on a second fetch: NO_SESSION_FOUND in the body, not a throw", async () => {
		const api = new mocks.ProviderApiMock();
		await api.getCaptchaChallenge("user", provider, "session-x");

		const repeat = await api.getCaptchaChallenge("user", provider, "session-x");

		expect(repeat[ApiParams.error]?.key).toBe("CAPTCHA.NO_SESSION_FOUND");
		expect(repeat[ApiParams.captchas]).toHaveLength(0);
	});
});
