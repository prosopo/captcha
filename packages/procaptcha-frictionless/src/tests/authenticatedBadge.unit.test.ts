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

import type { Account, RandomProvider } from "@prosopo/types";
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
});
