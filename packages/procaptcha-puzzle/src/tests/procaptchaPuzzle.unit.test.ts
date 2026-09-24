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
import type { ProcaptchaProps } from "@prosopo/types";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { ProcaptchaPuzzleHandle } from "../components/procaptchaWidget.js";
import * as entrypoint from "../index.js";
import { type Mounted, mount, settle } from "./domHarness.js";
import { config } from "./managerHarness.js";

/**
 * The outer entry point exists only to lazy-load the widget and hand it the
 * props it was given, so what is worth pinning down is that nothing is dropped
 * on the way through — a wrapper that names props one at a time silently loses
 * the ones added later.
 */
const mocks = vi.hoisted(() => ({
	received: [] as ProcaptchaProps[],
	destroyed: { count: 0 },
}));

vi.mock("../components/procaptchaWidget.js", () => ({
	mountProcaptchaPuzzleWidget: (
		container: HTMLElement,
		props: ProcaptchaProps,
	): ProcaptchaPuzzleHandle => {
		mocks.received.push(props);
		const element = document.createElement("div");
		element.setAttribute("data-testid", "widget");
		container.appendChild(element);
		return {
			destroy: () => {
				element.remove();
				mocks.destroyed.count += 1;
			},
		};
	},
}));

let mounted: Mounted;
let widget: ProcaptchaPuzzleHandle | undefined;

const props = (overrides: Partial<ProcaptchaProps> = {}): ProcaptchaProps => ({
	config: config(),
	callbacks: {},
	i18n: undefined as unknown as Ti18n,
	...overrides,
});

const render = async (widgetProps: ProcaptchaProps): Promise<void> => {
	widget = entrypoint.mountProcaptchaPuzzle(mounted.container, widgetProps);
	await settle();
};

beforeEach(() => {
	mocks.received.length = 0;
	mocks.destroyed.count = 0;
	widget = undefined;
	mounted = mount();
});

afterEach(() => {
	widget?.destroy();
	widget = undefined;
	mounted.unmount();
});

describe("mountProcaptchaPuzzle", () => {
	test("renders the widget once it has loaded", async () => {
		await render(props());
		expect(
			mounted.container.querySelector('[data-testid="widget"]'),
		).not.toBeNull();
	});

	test("passes on the props the widget needs but never names", async () => {
		const onSessionInvalidated = vi.fn<(x?: number, y?: number) => void>();
		await render(
			props({
				autoStart: true,
				startCoords: { x: 1, y: 2 },
				onSessionInvalidated,
			}),
		);
		expect(mocks.received[0]).toMatchObject({
			autoStart: true,
			startCoords: { x: 1, y: 2 },
			onSessionInvalidated,
		});
	});

	test("passes on the props it does name, too", async () => {
		const callbacks = { onHuman: vi.fn<(token: string) => void>() };
		await render(props({ callbacks }));
		expect(mocks.received[0]?.callbacks).toBe(callbacks);
		expect(mocks.received[0]?.config).toEqual(config());
	});

	test("tears the loaded widget down", async () => {
		await render(props());
		widget?.destroy();
		widget = undefined;
		expect(mocks.destroyed.count).toBe(1);
		expect(
			mounted.container.querySelector('[data-testid="widget"]'),
		).toBeNull();
	});

	test("cancels a mount that is still loading", async () => {
		// Otherwise a widget torn down mid-load reappears as an orphan that
		// nothing holds a handle to.
		widget = entrypoint.mountProcaptchaPuzzle(mounted.container, props());
		widget.destroy();
		widget = undefined;
		await settle();
		expect(mocks.received).toHaveLength(0);
	});
});

describe("the package entrypoint", () => {
	test("exports the mount functions a consumer needs", () => {
		expect(typeof entrypoint.mountProcaptchaPuzzle).toBe("function");
		expect(typeof entrypoint.loadProcaptchaPuzzle).toBe("function");
		expect(typeof entrypoint.mountProcaptchaPuzzleWidget).toBe("function");
	});
});
