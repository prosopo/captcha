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
	type GetIconOrderCaptchaResponse,
	type IconClick,
	type IconOrderEvent,
	ModeEnum,
	type ProcaptchaProps,
	type ProcaptchaState,
} from "@prosopo/types";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
	type ProcaptchaIconOrderHandle,
	mountProcaptchaIconOrderWidget,
} from "../components/procaptchaWidget.js";
import { type Mounted, fire, mount, settle } from "./domHarness.js";
import { challengeResponse, config, frictionless } from "./managerHarness.js";

// The canvas is deliberately real here: the widget suite stubs it, so only
// this suite shows the overlay actually becoming visible.
const mocks = vi.hoisted(() => {
	const start =
		vi.fn<
			(
				x?: number,
				y?: number,
			) => Promise<GetIconOrderCaptchaResponse | undefined>
		>();
	const submitSolution =
		vi.fn<
			(clicks: IconClick[], events: IconOrderEvent[]) => Promise<boolean>
		>();
	const resetState = vi.fn<() => void>();
	const dispose = vi.fn<() => void>();
	return { start, submitSolution, resetState, dispose };
});

vi.mock("../services/Manager.js", () => ({
	Manager: (
		_config: unknown,
		_state: ProcaptchaState,
		_updateState: (next: Partial<ProcaptchaState>) => void,
	) => ({
		start: mocks.start,
		submitSolution: mocks.submitSolution,
		resetState: mocks.resetState,
		dispose: mocks.dispose,
	}),
}));

vi.mock("@prosopo/locale", async (importOriginal) => ({
	...(await importOriginal<typeof import("@prosopo/locale")>()),
	loadI18next: vi.fn(async () => undefined),
}));

const i18nStub = {
	isInitialized: true,
	language: "en",
	t: (key: string) => key,
	changeLanguage: vi.fn(),
	hasLoadedNamespace: () => true,
	on: () => undefined,
	off: () => undefined,
} as unknown as Ti18n;

const props = (overrides: Partial<ProcaptchaProps> = {}): ProcaptchaProps =>
	({
		config: config({ mode: ModeEnum.visible }),
		callbacks: {},
		i18n: i18nStub,
		frictionlessState: frictionless(),
		...overrides,
	}) as unknown as ProcaptchaProps;

let mounted: Mounted;
let handle: ProcaptchaIconOrderHandle | undefined;

const surface = (): HTMLElement | null =>
	document.querySelector<HTMLElement>('[data-cy="challenge-surface"]');

// The outermost inline opacity is the panel's entrance animation.
const panelOpacity = (): string | undefined =>
	document
		.querySelector('[data-cy="challenge-content"]')
		?.querySelector<HTMLElement>("[style*='opacity']")?.style.opacity;

const frame = async (): Promise<void> => {
	await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
	await settle();
};

beforeEach(() => {
	mocks.start.mockResolvedValue(challengeResponse());
	mounted = mount();
});

afterEach(() => {
	handle?.destroy();
	handle = undefined;
	mounted.unmount();
	for (const layer of Array.from(
		document.querySelectorAll(".prosopo-challenge-surface"),
	)) {
		layer.remove();
	}
	vi.clearAllMocks();
});

describe("the icon-order overlay actually reaches the screen", () => {
	test("visible mode: the panel is opaque after the entrance frame", async () => {
		handle = mountProcaptchaIconOrderWidget(mounted.container, props());
		const checkbox = mounted.container.querySelector("input");
		expect(checkbox, "the visible widget renders a checkbox").not.toBeNull();
		if (checkbox) fire(checkbox, "click");
		await settle();
		await frame();

		expect(mocks.start).toHaveBeenCalledTimes(1);
		expect(surface(), "the overlay is mounted").not.toBeNull();
		expect(panelOpacity()).toBe("1");
	});

	test("invisible mode: the panel is opaque after the entrance frame", async () => {
		handle = mountProcaptchaIconOrderWidget(
			mounted.container,
			props({ config: config({ mode: ModeEnum.invisible }) }),
		);
		document.dispatchEvent(new Event("procaptcha:execute"));
		await settle();
		await frame();

		expect(mocks.start).toHaveBeenCalledTimes(1);
		expect(surface(), "the overlay is mounted").not.toBeNull();
		expect(panelOpacity()).toBe("1");
	});

	// The entrance frame is cancelled on teardown, so a canvas destroyed and
	// remounted before it runs would stay transparent for good.
	test("invisible mode: a remounted overlay still becomes opaque", async () => {
		handle = mountProcaptchaIconOrderWidget(
			mounted.container,
			props({ config: config({ mode: ModeEnum.invisible }) }),
		);
		document.dispatchEvent(new Event("procaptcha:execute"));
		await settle();
		await frame();
		expect(panelOpacity()).toBe("1");

		handle.destroy();
		handle = mountProcaptchaIconOrderWidget(
			mounted.container,
			props({ config: config({ mode: ModeEnum.invisible }) }),
		);
		document.dispatchEvent(new Event("procaptcha:execute"));
		await settle();
		await frame();

		expect(surface(), "the overlay is mounted again").not.toBeNull();
		expect(panelOpacity()).toBe("1");
	});
});
