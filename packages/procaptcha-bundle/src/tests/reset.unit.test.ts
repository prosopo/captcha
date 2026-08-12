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
 * `reset()` used to unmount every React root and then call `start()`, which
 * re-renders only on implicitly-rendered pages. An explicitly-rendered widget
 * was therefore destroyed and never rebuilt: the skeleton stayed in the DOM
 * with no checkbox inside it and no fresh captcha request was made. These
 * tests pin the remount so that regression cannot return.
 */

import type { Root } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

const makeRoot = (): Root =>
	({ unmount: vi.fn(), render: vi.fn() }) as unknown as Root;

/** Each createWidgets call yields a distinct root, as the real factory does. */
const queueRoots = (...roots: Root[]): void => {
	for (const root of roots) {
		mocks.createWidgets.mockResolvedValueOnce([root]);
	}
};

beforeEach(async () => {
	vi.clearAllMocks();
	// Drop any widgets registered by a previous test — module state persists
	// across tests in the same file.
	await remove();
	mocks.createWidgets.mockResolvedValue([makeRoot()]);
});

describe("render", () => {
	it("returns a widget id", async () => {
		queueRoots(makeRoot());

		const widgetId = await render(document.createElement("div"), {
			siteKey: SITE_KEY,
		});

		expect(typeof widgetId).toBe("string");
		expect(widgetId).toBeTruthy();
	});

	it("returns undefined when the factory creates no widget", async () => {
		mocks.createWidgets.mockResolvedValueOnce([] as Root[]);

		const widgetId = await render(document.createElement("div"), {
			siteKey: SITE_KEY,
		});

		expect(widgetId).toBeUndefined();
	});
});

describe("reset", () => {
	it("unmounts the old root and mounts a replacement", async () => {
		const first = makeRoot();
		const second = makeRoot();
		queueRoots(first, second);

		const element = document.createElement("div");
		await render(element, { siteKey: SITE_KEY });
		expect(mocks.createWidgets).toHaveBeenCalledTimes(1);

		await reset();

		expect(first.unmount).toHaveBeenCalledTimes(1);
		expect(mocks.createWidgets).toHaveBeenCalledTimes(2);
		// Rebuilt into the same element, with the options it was rendered with.
		expect(mocks.createWidgets).toHaveBeenLastCalledWith(
			[element],
			expect.objectContaining({ siteKey: SITE_KEY }),
			true,
			false,
		);
		expect(second.unmount).not.toHaveBeenCalled();
	});

	it("resets only the widget whose id is given", async () => {
		const firstA = makeRoot();
		const firstB = makeRoot();
		const replacementA = makeRoot();
		queueRoots(firstA, firstB, replacementA);

		const elementA = document.createElement("div");
		const elementB = document.createElement("div");
		const idA = await render(elementA, { siteKey: SITE_KEY });
		await render(elementB, { siteKey: SITE_KEY });

		await reset(idA);

		expect(firstA.unmount).toHaveBeenCalledTimes(1);
		expect(firstB.unmount).not.toHaveBeenCalled();
		expect(mocks.createWidgets).toHaveBeenLastCalledWith(
			[elementA],
			expect.anything(),
			true,
			false,
		);
	});

	it("keeps the widget resettable more than once", async () => {
		const roots = [makeRoot(), makeRoot(), makeRoot()];
		queueRoots(...roots);

		await render(document.createElement("div"), { siteKey: SITE_KEY });
		await reset();
		await reset();

		expect(roots[0]?.unmount).toHaveBeenCalledTimes(1);
		expect(roots[1]?.unmount).toHaveBeenCalledTimes(1);
		expect(mocks.createWidgets).toHaveBeenCalledTimes(3);
	});

	it("preserves the invisible flag when rebuilding", async () => {
		queueRoots(makeRoot(), makeRoot());

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
		queueRoots(makeRoot());
		await render(document.createElement("div"), { siteKey: SITE_KEY });

		await reset("procaptcha-widget-does-not-exist");

		expect(mocks.createWidgets).toHaveBeenCalledTimes(1);
	});
});

describe("remove", () => {
	it("unmounts without mounting a replacement", async () => {
		const root = makeRoot();
		queueRoots(root);

		const element = document.createElement("div");
		element.innerHTML = "<span>skeleton</span>";
		await render(element, { siteKey: SITE_KEY });

		await remove();

		expect(root.unmount).toHaveBeenCalledTimes(1);
		expect(mocks.createWidgets).toHaveBeenCalledTimes(1);
		// The skeleton is plain DOM, so unmounting React alone would leave it
		// behind — remove() is responsible for clearing the container too.
		expect(element.innerHTML).toBe("");
	});

	it("makes a subsequent reset a no-op", async () => {
		queueRoots(makeRoot());
		await render(document.createElement("div"), { siteKey: SITE_KEY });

		await remove();
		await reset();

		expect(mocks.createWidgets).toHaveBeenCalledTimes(1);
	});
});
