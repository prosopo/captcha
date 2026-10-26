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

import { PROCAPTCHA_EXECUTE_EVENT } from "@prosopo/procaptcha-common";
import {
	type Account,
	ApiParams,
	CaptchaType,
	type RandomProvider,
	decodeProcaptchaOutput,
} from "@prosopo/types";
import { darkTheme, lightTheme } from "@prosopo/widget-skeleton";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
	type AuthenticatedBadgeProps,
	mountAuthenticatedBadge,
} from "../authenticatedBadge.js";

const account: Account = { account: { address: "user-address" } };
const provider: RandomProvider = {
	providerAccount: "provider-account",
	provider: { url: "https://provider.one" },
};

let container: HTMLDivElement;
let destroy: (() => void) | undefined;

const mount = (
	overrides: Partial<AuthenticatedBadgeProps> = {},
): HTMLElement => {
	const badge = mountAuthenticatedBadge(container, {
		sessionId: "session-1",
		dapp: "site-key",
		userAccount: account,
		provider,
		callbacks: { onHuman: vi.fn<(token: string) => void>() },
		expiresInMs: 60_000,
		restart: vi.fn<() => void>(),
		...overrides,
	});
	destroy = badge.destroy;
	const element = container.querySelector<HTMLElement>('[role="status"]');
	if (!element) throw new Error("expected the badge to render");
	return element;
};

/** jsdom reports inline colours as rgb(), the theme holds hex. */
const asRgb = (hex: string): string => {
	const probe = document.createElement("span");
	probe.style.color = hex;
	return probe.style.color;
};

beforeEach(() => {
	container = document.createElement("div");
	document.body.appendChild(container);
});

afterEach(() => {
	destroy?.();
	destroy = undefined;
	container.remove();
});

describe("authenticated badge", () => {
	test("follows the dark theme", () => {
		const badge = mount({ theme: darkTheme });
		expect(badge.style.background).toBe(
			asRgb(darkTheme.palette.primaryContainer.main),
		);
		expect(badge.style.color).toBe(
			asRgb(darkTheme.palette.primaryContainer.contrastText),
		);
	});

	test("defaults to the light theme", () => {
		const badge = mount();
		expect(badge.style.background).toBe(
			asRgb(lightTheme.palette.primaryContainer.main),
		);
	});

	test("shows the translated text it is given", () => {
		const badge = mount({
			agent: "https://agent.example/",
			labels: {
				verifiedAgent: "Verifizierter Agent",
				trustedRequest: "Vertrauenswürdige Anfrage",
			},
		});
		expect(badge.textContent).toContain("Verifizierter Agent: agent.example");
	});

	test("is read out by its visible text, not a fixed label", () => {
		const badge = mount();
		expect(badge.hasAttribute("aria-label")).toBe(false);
		expect(badge.textContent).toContain("Trusted request");
	});

	test("issues an authenticated token for its session on mount", () => {
		const onHuman = vi.fn<(token: string) => void>();
		mount({ callbacks: { onHuman } });
		expect(onHuman).toHaveBeenCalledTimes(1);
		const token = decodeProcaptchaOutput(onHuman.mock.calls[0]?.[0] ?? "");
		expect(token[ApiParams.commitmentId]).toBe("session-1");
		expect(token[ApiParams.captchaType]).toBe(CaptchaType.authenticated);
	});
});

describe("authenticated badge in invisible mode", () => {
	const mountInvisible = (
		overrides: Partial<AuthenticatedBadgeProps> = {},
	): ReturnType<typeof vi.fn<(token: string) => void>> => {
		const onHuman = vi.fn<(token: string) => void>();
		destroy = mountAuthenticatedBadge(container, {
			sessionId: "session-1",
			dapp: "site-key",
			userAccount: account,
			provider,
			callbacks: { onHuman },
			invisible: true,
			expiresInMs: 60_000,
			restart: vi.fn<() => void>(),
			...overrides,
		}).destroy;
		return onHuman;
	};

	test("draws nothing and waits for execute()", () => {
		const onHuman = mountInvisible();
		expect(container.childElementCount).toBe(0);
		expect(onHuman).not.toHaveBeenCalled();

		document.dispatchEvent(new CustomEvent(PROCAPTCHA_EXECUTE_EVENT));
		expect(onHuman).toHaveBeenCalledTimes(1);
	});

	test("answers an execute() targeted at its widget container", () => {
		const widgetContainer = document.createElement("div");
		const onHuman = mountInvisible({ widgetContainer });

		widgetContainer.dispatchEvent(new CustomEvent(PROCAPTCHA_EXECUTE_EVENT));
		expect(onHuman).toHaveBeenCalledTimes(1);
	});

	test("stops listening once destroyed", () => {
		const onHuman = mountInvisible();
		destroy?.();
		destroy = undefined;

		document.dispatchEvent(new CustomEvent(PROCAPTCHA_EXECUTE_EVENT));
		expect(onHuman).not.toHaveBeenCalled();
	});
});

describe("authenticated badge expiry", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	test("expires the pass and restarts for a fresh session", () => {
		const onExpired = vi.fn<() => void>();
		const restart = vi.fn<() => void>();
		mount({
			callbacks: { onHuman: vi.fn<(token: string) => void>(), onExpired },
			expiresInMs: 60_000,
			restart,
		});

		vi.advanceTimersByTime(59_999);
		expect(restart).not.toHaveBeenCalled();

		vi.advanceTimersByTime(1);
		expect(onExpired).toHaveBeenCalledTimes(1);
		expect(restart).toHaveBeenCalledTimes(1);
	});

	test("does not restart after it is destroyed", () => {
		const restart = vi.fn<() => void>();
		mount({ restart });
		destroy?.();
		destroy = undefined;

		vi.advanceTimersByTime(120_000);
		expect(restart).not.toHaveBeenCalled();
	});
});
