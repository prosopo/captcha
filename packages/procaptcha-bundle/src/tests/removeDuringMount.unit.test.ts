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

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BundleCaptchaHandle } from "../util/captcha/components/bundleCaptcha.js";
import type { CreatedWidget } from "../util/widgetFactory.js";

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

const { execute, render, reset, remove } = await import("../index.js");

const SITE_KEY = "5CcNvLUdiXFpzKDMjThGLSK9rhWHA1H4EF3zrgkpkjAdqmuP";

type PendingMount = {
	handle: BundleCaptchaHandle;
	finish: () => void;
};

/**
 * Makes the next createWidgets call hang until `finish()`, then mount into the
 * element it was given, as the real factory does once its chunks have loaded.
 */
const holdNextMount = (): PendingMount => {
	const handle: BundleCaptchaHandle = { destroy: vi.fn() };
	let finish = (): void => undefined;
	mocks.createWidgets.mockImplementationOnce(
		(elements: Element[]): Promise<CreatedWidget[]> =>
			new Promise((resolve) => {
				finish = () => {
					const container = document.createElement("div");
					for (const element of elements) element.appendChild(container);
					resolve([{ handle, container }]);
				};
			}),
	);
	return { handle, finish: () => finish() };
};

const mountNow = (element: Element): Promise<string | undefined> => {
	const pending = holdNextMount();
	const rendered = render(element, { siteKey: SITE_KEY });
	pending.finish();
	return rendered;
};

beforeEach(() => {
	vi.clearAllMocks();
	vi.spyOn(console, "error").mockImplementation(() => undefined);
	remove();
});

describe("remove while a widget is still mounting", () => {
	it("does not let a pending render mount after remove()", async () => {
		const element = document.createElement("div");
		const pending = holdNextMount();

		const rendered = render(element, { siteKey: SITE_KEY });
		remove();
		pending.finish();

		expect(await rendered).toBeUndefined();
		expect(pending.handle.destroy).toHaveBeenCalledTimes(1);
		expect(element.childElementCount).toBe(0);
	});

	it("does not let a pending reset bring a removed widget back", async () => {
		const element = document.createElement("div");
		const id = await mountNow(element);
		const replacement = holdNextMount();

		const resetting = reset(id);
		remove(id);
		replacement.finish();
		await resetting;

		expect(replacement.handle.destroy).toHaveBeenCalledTimes(1);
		expect(element.childElementCount).toBe(0);
		execute(id);
		expect(console.error).toHaveBeenCalledWith(
			`No Procaptcha widget found with id ${id}`,
		);
	});

	it("still mounts a render that nothing removed", async () => {
		const element = document.createElement("div");

		const id = await mountNow(element);

		expect(id).toBeTruthy();
		expect(element.childElementCount).toBe(1);
	});

	it("keeps widgets rendered after a remove()", async () => {
		remove();
		const element = document.createElement("div");

		const id = await mountNow(element);

		expect(id).toBeTruthy();
		expect(element.childElementCount).toBe(1);
	});
});
