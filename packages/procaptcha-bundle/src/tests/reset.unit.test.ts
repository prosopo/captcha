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
 * `reset()` used to tear every widget down and then call `start()`, which
 * re-renders only on implicitly-rendered pages. An explicitly-rendered widget
 * was therefore destroyed and never rebuilt: the skeleton stayed in the DOM
 * with no checkbox inside it and no fresh captcha request was made. These
 * tests pin the remount so that regression cannot return.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BundleCaptchaHandle } from "../util/captcha/components/bundleCaptcha.js";

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

const { render, reset, remove } = await import("../index.js");

const SITE_KEY = "5CcNvLUdiXFpzKDMjThGLSK9rhWHA1H4EF3zrgkpkjAdqmuP";

const makeHandle = (): BundleCaptchaHandle => ({ destroy: vi.fn() });

/** Each createWidgets call yields a distinct handle, as the real factory does. */
const queueHandles = (...handles: BundleCaptchaHandle[]): void => {
	for (const handle of handles) {
		mocks.createWidgets.mockResolvedValueOnce([handle]);
	}
};

beforeEach(async () => {
	vi.clearAllMocks();
	// Drop any widgets registered by a previous test — module state persists
	// across tests in the same file.
	await remove();
	mocks.createWidgets.mockResolvedValue([makeHandle()]);
});

describe("render", () => {
	it("returns a widget id", async () => {
		queueHandles(makeHandle());

		const widgetId = await render(document.createElement("div"), {
			siteKey: SITE_KEY,
		});

		expect(typeof widgetId).toBe("string");
		expect(widgetId).toBeTruthy();
	});

	it("returns undefined when the factory creates no widget", async () => {
		mocks.createWidgets.mockResolvedValueOnce([] as BundleCaptchaHandle[]);

		const widgetId = await render(document.createElement("div"), {
			siteKey: SITE_KEY,
		});

		expect(widgetId).toBeUndefined();
	});
});

describe("reset", () => {
	it("destroys the old widget and mounts a replacement", async () => {
		const first = makeHandle();
		const second = makeHandle();
		queueHandles(first, second);

		const element = document.createElement("div");
		await render(element, { siteKey: SITE_KEY });
		expect(mocks.createWidgets).toHaveBeenCalledTimes(1);

		await reset();

		expect(first.destroy).toHaveBeenCalledTimes(1);
		expect(mocks.createWidgets).toHaveBeenCalledTimes(2);
		// Rebuilt into the same element, with the options it was rendered with.
		expect(mocks.createWidgets).toHaveBeenLastCalledWith(
			[element],
			expect.objectContaining({ siteKey: SITE_KEY }),
			true,
			false,
		);
		expect(second.destroy).not.toHaveBeenCalled();
	});

	it("resets only the widget whose id is given", async () => {
		const firstA = makeHandle();
		const firstB = makeHandle();
		const replacementA = makeHandle();
		queueHandles(firstA, firstB, replacementA);

		const elementA = document.createElement("div");
		const elementB = document.createElement("div");
		const idA = await render(elementA, { siteKey: SITE_KEY });
		await render(elementB, { siteKey: SITE_KEY });

		await reset(idA);

		expect(firstA.destroy).toHaveBeenCalledTimes(1);
		expect(firstB.destroy).not.toHaveBeenCalled();
		expect(mocks.createWidgets).toHaveBeenLastCalledWith(
			[elementA],
			expect.anything(),
			true,
			false,
		);
	});

	it("keeps the widget resettable more than once", async () => {
		const handles = [makeHandle(), makeHandle(), makeHandle()];
		queueHandles(...handles);

		await render(document.createElement("div"), { siteKey: SITE_KEY });
		await reset();
		await reset();

		expect(handles[0]?.destroy).toHaveBeenCalledTimes(1);
		expect(handles[1]?.destroy).toHaveBeenCalledTimes(1);
		expect(mocks.createWidgets).toHaveBeenCalledTimes(3);
	});

	it("preserves the invisible flag when rebuilding", async () => {
		queueHandles(makeHandle(), makeHandle());

		const button = document.createElement("button");
		await render(button, { siteKey: SITE_KEY });

		await reset();

		expect(mocks.createWidgets).toHaveBeenLastCalledWith(
			[button],
			expect.anything(),
			true,
			true,
		);
	});

	it("does nothing for an unknown widget id", async () => {
		queueHandles(makeHandle());
		await render(document.createElement("div"), { siteKey: SITE_KEY });

		await reset("procaptcha-widget-does-not-exist");

		expect(mocks.createWidgets).toHaveBeenCalledTimes(1);
	});
});

describe("remove", () => {
	it("destroys without mounting a replacement", async () => {
		const handle = makeHandle();
		queueHandles(handle);

		const element = document.createElement("div");
		element.innerHTML = "<span>skeleton</span>";
		await render(element, { siteKey: SITE_KEY });

		await remove();

		expect(handle.destroy).toHaveBeenCalledTimes(1);
		expect(mocks.createWidgets).toHaveBeenCalledTimes(1);
		// The skeleton is plain DOM the handle doesn't own, so destroying the
		// widget alone would leave it behind — remove() clears the container too.
		expect(element.innerHTML).toBe("");
	});

	it("makes a subsequent reset a no-op", async () => {
		queueHandles(makeHandle());
		await render(document.createElement("div"), { siteKey: SITE_KEY });

		await remove();
		await reset();

		expect(mocks.createWidgets).toHaveBeenCalledTimes(1);
	});
});
