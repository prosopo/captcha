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
 * `window.procaptcha.start()` is how a site kicks off a widget rendered with
 * `startMode: "manual"`. It reaches the widget as a `procaptcha:start` event
 * addressed to the element the widget was rendered into, so that one call
 * can target one widget on a page that has several.
 */

import {
	PROCAPTCHA_START_EVENT,
	type ProcaptchaStartEventDetail,
	StartModeEnum,
} from "@prosopo/types";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	prefetchDetector: vi.fn(),
	createWidgets: vi.fn(),
}));

vi.mock("@prosopo/procaptcha-frictionless", () => ({
	prefetchDetector: mocks.prefetchDetector,
}));

vi.mock("@prosopo/procaptcha-common", () => ({
	getWindowCallback: vi.fn(),
	pickIpMode: vi.fn(() => undefined),
}));

vi.mock("../util/widgetFactory.js", () => ({
	WidgetFactory: vi.fn(function () {
		return { createWidgets: mocks.createWidgets };
	}),
}));

const { render, remove, start } = await import("../index.js");

const SITE_KEY = "5CcNvLUdiXFpzKDMjThGLSK9rhWHA1H4EF3zrgkpkjAdqmuP";

const makeRoot = (): Root =>
	({ unmount: vi.fn(), render: vi.fn() }) as unknown as Root;

const flush = (): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, 0));

const renderWidget = async (
	options: Partial<Parameters<typeof render>[1]> = {},
): Promise<{ element: HTMLDivElement; id: string }> => {
	mocks.createWidgets.mockResolvedValueOnce([makeRoot()]);
	const element = document.createElement("div");
	const id = await render(element, { siteKey: SITE_KEY, ...options });
	if (!id) throw new Error("expected render to return a widget id");
	return { element, id };
};

let received: ProcaptchaStartEventDetail[];
const onStart = (event: Event): void => {
	received.push((event as CustomEvent<ProcaptchaStartEventDetail>).detail);
};

beforeEach(async () => {
	vi.clearAllMocks();
	await remove();
	received = [];
	document.addEventListener(PROCAPTCHA_START_EVENT, onStart);
});

afterEach(() => {
	document.removeEventListener(PROCAPTCHA_START_EVENT, onStart);
});

describe("start", () => {
	it("addresses one event to each widget when no id is given", async () => {
		const first = await renderWidget();
		const second = await renderWidget();

		start();

		expect(received.map((detail) => detail.element)).toEqual([
			first.element,
			second.element,
		]);
	});

	it("addresses the event to the widget whose id is given", async () => {
		await renderWidget();
		const second = await renderWidget();

		start(second.id);

		expect(received).toHaveLength(1);
		expect(received[0]?.element).toBe(second.element);
	});

	it("reports an unknown id instead of dispatching", async () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		await renderWidget();

		start("procaptcha-widget-does-not-exist");

		expect(received).toHaveLength(0);
		expect(error).toHaveBeenCalledTimes(1);
		error.mockRestore();
	});

	it("reports when there is nothing to start", () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});

		start();

		expect(received).toHaveLength(0);
		expect(error).toHaveBeenCalledTimes(1);
		error.mockRestore();
	});

	it("is exposed on window.procaptcha", () => {
		expect(window.procaptcha.start).toBe(start);
	});
});

describe("detector prefetch", () => {
	it("runs on render in auto mode", async () => {
		await renderWidget();
		await flush();

		expect(mocks.prefetchDetector).toHaveBeenCalledTimes(1);
	});

	it("is skipped in manual mode so nothing reaches the provider on load", async () => {
		await renderWidget({ startMode: StartModeEnum.manual });
		await flush();

		expect(mocks.prefetchDetector).not.toHaveBeenCalled();
	});

	it("is skipped when the element asks for manual mode", async () => {
		mocks.createWidgets.mockResolvedValueOnce([makeRoot()]);
		const element = document.createElement("div");
		element.setAttribute("data-start-mode", "manual");
		await render(element, { siteKey: SITE_KEY });
		await flush();

		expect(mocks.prefetchDetector).not.toHaveBeenCalled();
	});
});
