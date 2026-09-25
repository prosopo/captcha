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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CreatedWidget } from "../util/widgetFactory.js";

const mocks = vi.hoisted(() => ({
	createWidgets: vi.fn(),
}));

vi.mock("@prosopo/procaptcha-frictionless", () => ({
	prefetchDetector: vi.fn(),
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

const loadBundle = async (): Promise<void> => {
	vi.resetModules();
	await import("../index.js");
	await Promise.resolve();
};

const readyEvents = (): number[] => {
	const seen: number[] = [];
	document.addEventListener("procaptcha:ready", () => seen.push(1));
	return seen;
};

beforeEach(() => {
	vi.clearAllMocks();
	vi.spyOn(console, "log").mockImplementation(() => undefined);
	vi.spyOn(console, "warn").mockImplementation(() => undefined);
	mocks.createWidgets.mockResolvedValue([] as CreatedWidget[]);
	Reflect.deleteProperty(window, "procaptcha");
	document.body.innerHTML =
		'<div class="procaptcha" data-sitekey="5CcNvLUdiXFpzKDMjThGLSK9rhWHA1H4EF3zrgkpkjAdqmuP"></div>';
});

afterEach(() => {
	document.body.innerHTML = "";
	Reflect.deleteProperty(window, "procaptcha");
});

describe("loading the bundle more than once", () => {
	it("keeps the first copy's api and renders the page's widgets once", async () => {
		await loadBundle();
		const first = window.procaptcha;

		await loadBundle();

		expect(window.procaptcha).toBe(first);
		expect(mocks.createWidgets).toHaveBeenCalledTimes(1);
	});

	it("announces itself only once", async () => {
		const seen = readyEvents();

		await loadBundle();
		await loadBundle();

		expect(seen).toHaveLength(1);
	});
});

describe("a page that already owns window.procaptcha", () => {
	it("leaves the page's own value in place and says why", async () => {
		const pageOwned = { version: "the host page's own object" };
		Object.assign(window, { procaptcha: pageOwned });

		await loadBundle();

		expect(Reflect.get(window, "procaptcha")).toBe(pageOwned);
		expect(console.warn).toHaveBeenCalledWith(
			expect.stringContaining("window.procaptcha"),
		);
	});

	it("still renders the page's widgets", async () => {
		Object.assign(window, { procaptcha: { version: "host" } });

		await loadBundle();

		expect(mocks.createWidgets).toHaveBeenCalledTimes(1);
	});
});
