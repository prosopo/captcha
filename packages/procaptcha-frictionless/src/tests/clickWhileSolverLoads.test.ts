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
	type BotDetectionFunctionResult,
	CaptchaType,
	ModeEnum,
	type ProcaptchaClientConfigOutput,
	type ProcaptchaProps,
	type RandomProvider,
	StartModeEnum,
} from "@prosopo/types";
import { afterEach, expect, it, vi } from "vitest";

// The image solver's chunk stays unloaded until the test releases it, so a
// click can land after /frictionless has answered but before the solver
// replaces the placeholder. Its own file because a module mock is loaded once
// per file.
const mocks = vi.hoisted(() => {
	const mounts: ProcaptchaProps[] = [];
	let release: () => void = () => undefined;
	const loaded = new Promise<void>((resolve: () => void) => {
		release = resolve;
	});
	return { mounts, loaded, release: () => release() };
});

vi.mock("@prosopo/procaptcha-react", async () => {
	await mocks.loaded;
	return {
		mountProcaptchaImageWidget: (
			container: HTMLElement,
			props: ProcaptchaProps,
		) => {
			mocks.mounts.push(props);
			const element = container.ownerDocument.createElement("div");
			container.appendChild(element);
			return { destroy: () => element.remove() };
		},
	};
});

vi.mock("@prosopo/procaptcha-common", async (importOriginal) => ({
	...(await importOriginal<typeof import("@prosopo/procaptcha-common")>()),
	isSecureBrowserContext: () => true,
}));

const { mountProcaptchaFrictionless } = await import(
	"../procaptchaFrictionless.js"
);

const settle = async (): Promise<void> => {
	await new Promise<void>((resolve: () => void) => setTimeout(resolve, 0));
	await Promise.resolve();
};

// jsdom exposes `isTrusted` as a non-configurable accessor on its internal
// implementation object, so the flag has to be pinned there.
const trustedClick = (clientX: number, clientY: number): MouseEvent => {
	const event = new MouseEvent("click", {
		bubbles: true,
		cancelable: true,
		clientX,
		clientY,
	});
	for (const symbol of Object.getOwnPropertySymbols(event)) {
		const impl: unknown = Reflect.get(event, symbol);
		if (impl && typeof impl === "object" && "isTrusted" in impl) {
			Object.defineProperty(impl, "isTrusted", {
				configurable: true,
				get: () => true,
				set: () => undefined,
			});
		}
	}
	return event;
};

let widget: { destroy: () => void } | undefined;
const host = document.createElement("div");
document.body.appendChild(host);

afterEach(() => {
	widget?.destroy();
});

it("keeps a click made while the chosen solver is still loading", async () => {
	const detectBot = vi.fn<BotDetectionFunction>().mockResolvedValue({
		status: "ok",
		captchaType: CaptchaType.image,
		sessionId: "provider-session",
		provider: { provider: { url: "https://provider.test" } } as RandomProvider,
		userAccount: { account: { address: "5FakeUserAccountAddress" } } as Account,
	} as unknown as BotDetectionFunctionResult);

	widget = mountProcaptchaFrictionless(host, {
		config: {
			account: { address: "5siteKey" },
			web2: true,
			theme: "light",
			mode: ModeEnum.visible,
			startMode: StartModeEnum.auto,
		} as unknown as ProcaptchaClientConfigOutput,
		callbacks: {},
		restart: vi.fn(),
		i18n: {
			isInitialized: true,
			language: "en",
			t: (key: string) => key,
			changeLanguage: vi.fn(),
		} as unknown as Ti18n,
		detectBot,
	});
	await settle();
	expect(detectBot).toHaveBeenCalledTimes(1);

	const checkbox = host.querySelector<HTMLInputElement>(
		'[data-cy="captcha-checkbox"]',
	);
	if (!checkbox) throw new Error("expected the placeholder checkbox");
	checkbox.dispatchEvent(trustedClick(5, 6));

	mocks.release();
	await vi.waitFor(() => expect(mocks.mounts).toHaveLength(1));

	expect(mocks.mounts[0]?.autoStart).toBe(true);
	expect(mocks.mounts[0]?.startCoords).toEqual({ x: 5, y: 6 });
});
