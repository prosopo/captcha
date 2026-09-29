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
	type BotDetectionFunction,
	CaptchaType,
	type FrictionlessState,
	ModeEnum,
	type ProcaptchaClientConfigOutput,
	type ProcaptchaProps,
	type RandomProvider,
} from "@prosopo/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Every widget the frictionless wrapper can mount records the props it was
// handed, so a test can assert on the config that reached the *second* mount
// after an escalation without rendering a real captcha.
const mocks = vi.hoisted(() => {
	const mounts: {
		widget: "pow" | "image" | "puzzle";
		props: ProcaptchaProps;
	}[] = [];
	const stub =
		(widget: "pow" | "image" | "puzzle") =>
		(host: HTMLElement, props: ProcaptchaProps) => {
			mounts.push({ widget, props });
			const element = host.ownerDocument.createElement("div");
			element.setAttribute("data-widget", widget);
			host.appendChild(element);
			return { destroy: () => element.remove() };
		};
	return { mounts, stub };
});

vi.mock("@prosopo/procaptcha-pow", () => ({
	mountProcaptchaPowWidget: mocks.stub("pow"),
}));
vi.mock("@prosopo/procaptcha-react", () => ({
	mountProcaptchaImageWidget: mocks.stub("image"),
}));
vi.mock("@prosopo/procaptcha-puzzle", () => ({
	mountProcaptchaPuzzleWidget: mocks.stub("puzzle"),
}));

// The wrapper refuses to run outside a secure context, and jsdom's
// `isSecureContext` is not reliably true across environments. Everything else
// from procaptcha-common (the checkbox, getDefaultEvents, providerRetry) is
// the real implementation.
vi.mock("@prosopo/procaptcha-common", async (importOriginal) => ({
	...(await importOriginal<typeof import("@prosopo/procaptcha-common")>()),
	isSecureBrowserContext: () => true,
}));

// Imported after the mocks so the lazy loaders inside resolve to the stubs.
const { mountProcaptchaFrictionless } = await import(
	"../procaptchaFrictionless.js"
);

const SITE_KEY = "5siteKey";
const CLIENT_SESSION_ID = "jti-from-the-site";
const FIRST_SESSION_ID = "provider-session-1";
const ESCALATED_SESSION_ID = "provider-session-2";

const config = (): ProcaptchaClientConfigOutput =>
	({
		account: { address: SITE_KEY },
		userAccountAddress: "",
		web2: true,
		theme: "light",
		mode: ModeEnum.visible,
		// What the site set via data-sessionid / renderOptions.sessionId.
		clientSessionId: CLIENT_SESSION_ID,
	}) as unknown as ProcaptchaClientConfigOutput;

const i18nStub = {
	isInitialized: true,
	language: "en",
	t: (key: string) => key,
	changeLanguage: vi.fn(),
} as unknown as Ti18n;

// Minimal shape of what customDetectBot resolves to; only the fields the
// wrapper reads on the happy path need to be present.
const detectBotReturning = (captchaType: CaptchaType) =>
	vi.fn<BotDetectionFunction>().mockResolvedValue({
		captchaType,
		sessionId: FIRST_SESSION_ID,
		provider: { provider: { url: "https://provider.test" } } as RandomProvider,
		userAccount: "userAccount",
	} as unknown as Awaited<ReturnType<BotDetectionFunction>>);

let container: HTMLDivElement;
let widget: { destroy: () => void } | undefined;

const settle = async (): Promise<void> => {
	await new Promise<void>((resolve: () => void) => setTimeout(resolve, 0));
	await Promise.resolve();
};

const mountWrapper = async (
	captchaType: CaptchaType,
	configOverrides: Partial<ProcaptchaClientConfigOutput> = {},
): Promise<void> => {
	widget = mountProcaptchaFrictionless(container, {
		config: { ...config(), ...configOverrides },
		callbacks: {},
		restart: vi.fn(),
		i18n: i18nStub,
		detectBot: detectBotReturning(captchaType),
	});
	await settle();
};

const lastMountOf = (target: "pow" | "image" | "puzzle") => {
	const mount = mocks.mounts.filter((m) => m.widget === target).at(-1);
	if (!mount) throw new Error(`expected the ${target} widget to have mounted`);
	return mount;
};

const escalate = async (to: CaptchaType): Promise<void> => {
	const { onEscalate } = lastMountOf("pow").props;
	onEscalate?.(
		to as CaptchaType.image | CaptchaType.puzzle,
		ESCALATED_SESSION_ID,
	);
	await settle();
};

beforeEach(() => {
	mocks.mounts.length = 0;
	widget = undefined;
	container = document.createElement("div");
	document.body.appendChild(container);
});

afterEach(() => {
	widget?.destroy();
	widget = undefined;
	container.remove();
	vi.clearAllMocks();
});

// The PoW -> image/puzzle escalation is the one flow where a user solves a
// second captcha under a *different* provider session. The client session id
// has to survive that handoff, or the dapp server's verify call would be
// correlated against an escalated record that never carried it and every
// escalated user would be rejected.
describe("client session id across a PoW escalation", () => {
	it("reaches the PoW widget on the first mount", async () => {
		await mountWrapper(CaptchaType.pow);

		expect(lastMountOf("pow").props.config.clientSessionId).toBe(
			CLIENT_SESSION_ID,
		);
	});

	it("survives the handoff to the escalated image widget", async () => {
		await mountWrapper(CaptchaType.pow);

		// The provider accepted the PoW but wants a visual challenge; the PoW
		// widget calls back with the replacement session the provider minted.
		await escalate(CaptchaType.image);

		expect(lastMountOf("image").props.config.clientSessionId).toBe(
			CLIENT_SESSION_ID,
		);
	});

	it("survives the handoff to the escalated puzzle widget", async () => {
		await mountWrapper(CaptchaType.pow);

		await escalate(CaptchaType.puzzle);

		expect(lastMountOf("puzzle").props.config.clientSessionId).toBe(
			CLIENT_SESSION_ID,
		);
	});

	it("swaps the provider session id but not the client one", async () => {
		await mountWrapper(CaptchaType.pow);

		const powState = lastMountOf("pow").props
			.frictionlessState as FrictionlessState;
		expect(powState.sessionId).toBe(FIRST_SESSION_ID);

		await escalate(CaptchaType.image);

		const imageMount = lastMountOf("image").props;
		const imageState = imageMount.frictionlessState as FrictionlessState;
		// These are different identifiers and must not be conflated: the
		// provider session rotates on escalation, the site's own session does
		// not. The verify-time correlation keys off the latter.
		expect(imageState.sessionId).toBe(ESCALATED_SESSION_ID);
		expect(imageMount.config.clientSessionId).toBe(CLIENT_SESSION_ID);
	});

	it("carries no client session id when the site rendered without one", async () => {
		await mountWrapper(CaptchaType.pow, { clientSessionId: undefined });

		await escalate(CaptchaType.image);

		expect(lastMountOf("image").props.config.clientSessionId).toBeUndefined();
	});
});
