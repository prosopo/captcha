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

import type { Ti18n } from "@prosopo/locale";
import {
	type Account,
	type BotDetectionFunction,
	CaptchaType,
	ModeEnum,
	type ProcaptchaClientConfigOutput,
	type ProcaptchaProps,
	type RandomProvider,
} from "@prosopo/types";
import {
	type Mock,
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { MAX_SESSION_INVALIDATED_RETRIES } from "../sessionInvalidatedRecovery.js";

const mocks = vi.hoisted(() => {
	const mounts: { props: ProcaptchaProps }[] = [];
	const stub = (host: HTMLElement, props: ProcaptchaProps) => {
		mounts.push({ props });
		const element = host.ownerDocument.createElement("div");
		element.setAttribute("data-widget", "image");
		host.appendChild(element);
		return { destroy: () => element.remove() };
	};
	return { mounts, stub };
});

vi.mock("@prosopo/procaptcha-react", () => ({
	mountProcaptchaImageWidget: mocks.stub,
}));
vi.mock("@prosopo/procaptcha-pow", () => ({
	mountProcaptchaPowWidget: mocks.stub,
}));
vi.mock("@prosopo/procaptcha-puzzle", () => ({
	mountProcaptchaPuzzleWidget: mocks.stub,
}));

// jsdom serves the suite over http, so the widget's own HTTPS guard would
// short-circuit every test before detection ran.
vi.mock("@prosopo/procaptcha-common", async (importOriginal) => ({
	...(await importOriginal<typeof import("@prosopo/procaptcha-common")>()),
	isSecureBrowserContext: () => true,
}));

const { mountProcaptchaFrictionless } = await import(
	"../procaptchaFrictionless.js"
);

const SITE_KEY = "5siteKey";

const config = (): ProcaptchaClientConfigOutput =>
	({
		account: { address: SITE_KEY },
		userAccountAddress: "",
		web2: true,
		theme: "light",
		mode: ModeEnum.visible,
	}) as unknown as ProcaptchaClientConfigOutput;

const i18nStub = {
	isInitialized: true,
	language: "en",
	t: (key: string) => key,
	changeLanguage: vi.fn(),
} as unknown as Ti18n;

const provider: RandomProvider = {
	providerAccount: "provider-account",
	provider: { url: "https://provider.test" },
} as unknown as RandomProvider;

const userAccount: Account = {
	account: { address: "user-address" },
} as unknown as Account;

// Each /frictionless run mints a new session, exactly as the provider does.
let sessionCounter = 0;
const detectBot: Mock<BotDetectionFunction> = vi.fn(async () => {
	sessionCounter += 1;
	return {
		captchaType: CaptchaType.image,
		sessionId: `provider-session-${sessionCounter}`,
		status: "ok",
		provider,
		userAccount,
	};
});

let container: HTMLDivElement;
let widget: { destroy: () => void } | undefined;
let restart: Mock<() => void>;
let onError: Mock<(error: Error) => void>;

const settle = async (): Promise<void> => {
	await new Promise<void>((resolve: () => void) => setTimeout(resolve, 0));
	await Promise.resolve();
};

const lastMount = () => {
	const mount = mocks.mounts.at(-1);
	if (!mount) throw new Error("expected the image widget to have mounted");
	return mount;
};

/** The inner widget reporting `CAPTCHA.NO_SESSION_FOUND` on its challenge fetch. */
const reportSessionInvalidated = async (): Promise<void> => {
	const { onSessionInvalidated } = lastMount().props;
	onSessionInvalidated?.(120, 340);
	await settle();
};

const isCheckboxPlaceholder = (): boolean =>
	container.querySelector('[data-widget="image"]') === null;

beforeEach(async () => {
	mocks.mounts.length = 0;
	sessionCounter = 0;
	detectBot.mockClear();
	restart = vi.fn<() => void>();
	onError = vi.fn<(error: Error) => void>();
	container = document.createElement("div");
	document.body.appendChild(container);
	widget = mountProcaptchaFrictionless(container, {
		config: config(),
		callbacks: { onError },
		restart,
		i18n: i18nStub,
		detectBot,
	});
	await settle();
});

afterEach(() => {
	widget?.destroy();
	widget = undefined;
	container.remove();
	vi.clearAllMocks();
});

// Production, 2026-09-07: the widget re-sent an already-consumed sessionId to
// /captcha/image, the provider answered 400 CAPTCHA.NO_SESSION_FOUND, and the
// user was left staring at a checkbox reading "No session found" with nothing
// behind it. The outer recovery guard was one-shot per widget lifetime and the
// inner widget always returns through this handler, so the second failure was
// handled by nobody at all.
describe("NO_SESSION_FOUND recovery in the frictionless widget", () => {
	it("re-mints a session and re-mounts the widget on the first failure", async () => {
		expect(detectBot).toHaveBeenCalledTimes(1);
		expect(lastMount().props.frictionlessState?.sessionId).toBe(
			"provider-session-1",
		);

		await reportSessionInvalidated();

		expect(detectBot).toHaveBeenCalledTimes(2);
		expect(lastMount().props.frictionlessState?.sessionId).toBe(
			"provider-session-2",
		);
	});

	it("resumes with autoStart and the original click coords, so the user needn't click twice", async () => {
		await reportSessionInvalidated();

		expect(lastMount().props.autoStart).toBe(true);
		expect(lastMount().props.startCoords).toEqual({ x: 120, y: 340 });
	});

	it("keeps recovering past the first failure rather than dead-ending", async () => {
		for (let i = 0; i < MAX_SESSION_INVALIDATED_RETRIES; i++) {
			await reportSessionInvalidated();
		}

		// One initial run plus one re-mint per failure.
		expect(detectBot).toHaveBeenCalledTimes(
			MAX_SESSION_INVALIDATED_RETRIES + 1,
		);
		expect(isCheckboxPlaceholder()).toBe(false);
	});

	it("falls over visibly once the retry budget is spent instead of stranding the user", async () => {
		for (let i = 0; i <= MAX_SESSION_INVALIDATED_RETRIES; i++) {
			await reportSessionInvalidated();
		}

		// The budget-exceeding failure must not silently do nothing: the error
		// reaches the host page and the widget renders the error placeholder,
		// whose NO_SESSION_FOUND branch schedules the full restart.
		expect(onError).toHaveBeenCalled();
		expect(isCheckboxPlaceholder()).toBe(true);
		expect(detectBot).toHaveBeenCalledTimes(
			MAX_SESSION_INVALIDATED_RETRIES + 1,
		);
	});

	// `resetState(0)` used to be `0 || state.attemptCount`, so the counter never
	// went back to zero and `start()`'s own `attemptCount >= 5` fall-over fired
	// after five cumulative runs — five successful reload presses were enough to
	// strand the user on the error placeholder.
	it("does not fall over after repeated successful reloads", async () => {
		for (let i = 0; i < 8; i++) {
			const { onReload } = lastMount().props;
			onReload?.(10, 20);
			await settle();
		}

		expect(isCheckboxPlaceholder()).toBe(false);
		expect(onError).not.toHaveBeenCalled();
		expect(detectBot).toHaveBeenCalledTimes(9);
	});

	it("gives a reload press a fresh retry budget — it mints a genuinely new session", async () => {
		for (let i = 0; i < MAX_SESSION_INVALIDATED_RETRIES; i++) {
			await reportSessionInvalidated();
		}
		const beforeReload = detectBot.mock.calls.length;

		const { onReload } = lastMount().props;
		onReload?.(10, 20);
		await settle();
		expect(detectBot).toHaveBeenCalledTimes(beforeReload + 1);

		// Without the reset this failure would land on the exhausted branch.
		await reportSessionInvalidated();

		expect(detectBot).toHaveBeenCalledTimes(beforeReload + 2);
		expect(isCheckboxPlaceholder()).toBe(false);
	});
});
