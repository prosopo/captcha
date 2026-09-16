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
	CaptchaType,
	type FrictionlessState,
	ModeEnum,
	type ProcaptchaClientConfigInput,
	type ProcaptchaProps,
	type RandomProvider,
} from "@prosopo/types";
import { type ReactElement, act, createElement } from "react";
import { type Root, createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

declare global {
	var IS_REACT_ACT_ENVIRONMENT: boolean;
}

// React only lets act() drive its scheduler when the environment says so;
// without this every render warns and updates flush unpredictably.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Every widget the frictionless wrapper can mount records the props it was
// handed, so a test can assert on the config that reached the *second* mount
// after an escalation without rendering a real captcha.
const mocks = vi.hoisted(() => ({
	mounts: [] as {
		widget: "pow" | "image" | "puzzle";
		props: ProcaptchaProps;
	}[],
}));

const stub =
	(widget: "pow" | "image" | "puzzle") => (props: ProcaptchaProps) => {
		mocks.mounts.push({ widget, props });
		return createElement("div", { "data-widget": widget });
	};

vi.mock("@prosopo/procaptcha-pow", () => ({ ProcaptchaPow: stub("pow") }));
vi.mock("@prosopo/procaptcha-react", () => ({ Procaptcha: stub("image") }));
vi.mock("@prosopo/procaptcha-puzzle", () => ({
	ProcaptchaPuzzle: stub("puzzle"),
}));

// The wrapper refuses to run outside a secure context, and jsdom's
// `isSecureContext` is not reliably true across environments. Everything else
// from procaptcha-common (Checkbox, getDefaultEvents, providerRetry) is the
// real implementation.
vi.mock("@prosopo/procaptcha-common", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@prosopo/procaptcha-common")>();
	return { ...actual, isSecureBrowserContext: () => true };
});

// Imported after the mocks so the lazy loaders inside resolve to the stubs.
const { ProcaptchaFrictionless } = await import("../ProcaptchaFrictionless.js");

const SITE_KEY = "5siteKey";
const CLIENT_SESSION_ID = "jti-from-the-site";
const FIRST_SESSION_ID = "provider-session-1";
const ESCALATED_SESSION_ID = "provider-session-2";

const config = (): ProcaptchaClientConfigInput => ({
	account: { address: SITE_KEY },
	userAccountAddress: "",
	web2: true,
	mode: ModeEnum.visible,
	// What the site set via data-sessionid / renderOptions.sessionId.
	clientSessionId: CLIENT_SESSION_ID,
});

const i18nStub = {
	isInitialized: true,
	language: "en",
	t: (key: string) => key,
	changeLanguage: vi.fn(),
} as unknown as Ti18n;

// Minimal shape of what customDetectBot resolves to; only the fields the
// wrapper reads on the happy path need to be present.
const detectBotReturning = (captchaType: CaptchaType) =>
	vi.fn().mockResolvedValue({
		captchaType,
		sessionId: FIRST_SESSION_ID,
		provider: { provider: { url: "https://provider.test" } } as RandomProvider,
		userAccount: "userAccount",
	});

let container: HTMLDivElement;
let root: Root;

const mountWrapper = async (captchaType: CaptchaType): Promise<void> => {
	await act(async () => {
		root.render(
			createElement(ProcaptchaFrictionless, {
				config: config(),
				callbacks: {},
				restart: vi.fn(),
				i18n: i18nStub,
				detectBot: detectBotReturning(captchaType),
			}) as ReactElement,
		);
	});
};

const lastMountOf = (widget: "pow" | "image" | "puzzle") => {
	const mount = mocks.mounts.filter((m) => m.widget === widget).at(-1);
	if (!mount) throw new Error(`expected the ${widget} widget to have mounted`);
	return mount;
};

beforeEach(() => {
	mocks.mounts.length = 0;
	container = document.createElement("div");
	document.body.appendChild(container);
	act(() => {
		root = createRoot(container);
	});
});

afterEach(() => {
	act(() => {
		root.unmount();
	});
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
		const { onEscalate } = lastMountOf("pow").props;
		await act(async () => {
			onEscalate?.(CaptchaType.image, ESCALATED_SESSION_ID);
		});

		expect(lastMountOf("image").props.config.clientSessionId).toBe(
			CLIENT_SESSION_ID,
		);
	});

	it("survives the handoff to the escalated puzzle widget", async () => {
		await mountWrapper(CaptchaType.pow);

		const { onEscalate } = lastMountOf("pow").props;
		await act(async () => {
			onEscalate?.(CaptchaType.puzzle, ESCALATED_SESSION_ID);
		});

		expect(lastMountOf("puzzle").props.config.clientSessionId).toBe(
			CLIENT_SESSION_ID,
		);
	});

	it("swaps the provider session id but not the client one", async () => {
		await mountWrapper(CaptchaType.pow);

		const powState = lastMountOf("pow").props
			.frictionlessState as FrictionlessState;
		expect(powState.sessionId).toBe(FIRST_SESSION_ID);

		const { onEscalate } = lastMountOf("pow").props;
		await act(async () => {
			onEscalate?.(CaptchaType.image, ESCALATED_SESSION_ID);
		});

		const imageMount = lastMountOf("image").props;
		const imageState = imageMount.frictionlessState as FrictionlessState;
		// These are different identifiers and must not be conflated: the
		// provider session rotates on escalation, the site's own session does
		// not. The verify-time correlation keys off the latter.
		expect(imageState.sessionId).toBe(ESCALATED_SESSION_ID);
		expect(imageMount.config.clientSessionId).toBe(CLIENT_SESSION_ID);
	});

	it("carries no client session id when the site rendered without one", async () => {
		await act(async () => {
			root.render(
				createElement(ProcaptchaFrictionless, {
					config: { ...config(), clientSessionId: undefined },
					callbacks: {},
					restart: vi.fn(),
					i18n: i18nStub,
					detectBot: detectBotReturning(CaptchaType.pow),
				}) as ReactElement,
			);
		});

		const { onEscalate } = lastMountOf("pow").props;
		await act(async () => {
			onEscalate?.(CaptchaType.image, ESCALATED_SESSION_ID);
		});

		expect(lastMountOf("image").props.config.clientSessionId).toBeUndefined();
	});
});
