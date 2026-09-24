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
 * A script injected after the page has loaded (a tag manager, an SPA that
 * lazy-loads the captcha) runs while `document.readyState` is already
 * "complete", and its `load` event fires straight afterwards. Boot must render
 * and call the onload callback once across both of those, not once for each.
 */

import type { ProcaptchaRenderOptions } from "@prosopo/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CreatedWidget } from "../util/widgetFactory.js";

const mocks = vi.hoisted(() => ({
	createWidgets:
		vi.fn<
			(
				containers: Element[],
				renderOptions: ProcaptchaRenderOptions,
				isWeb2?: boolean,
				invisible?: boolean,
			) => Promise<CreatedWidget[]>
		>(),
	prefetchDetector: vi.fn<() => void>(),
}));

vi.mock("@prosopo/procaptcha-frictionless", () => ({
	prefetchDetector: mocks.prefetchDetector,
}));

vi.mock("@prosopo/procaptcha-common", () => ({
	getWindowCallback:
		(name: string) =>
		(...args: unknown[]): unknown => {
			const fn: unknown = Reflect.get(window, name);
			return typeof fn === "function" ? fn(...args) : undefined;
		},
	pickIpMode: () => undefined,
}));

vi.mock("../util/widgetFactory.js", () => ({
	WidgetFactory: vi.fn(function () {
		return { createWidgets: mocks.createWidgets };
	}),
}));

const SITE_KEY = "5CcNvLUdiXFpzKDMjThGLSK9rhWHA1H4EF3zrgkpkjAdqmuP";

const flush = async (): Promise<void> => {
	await new Promise<void>((resolve: () => void) => setTimeout(resolve, 0));
};

const injectScript = (query: string): HTMLScriptElement => {
	const script = document.createElement("script");
	// A non-JS type stops jsdom fetching the src; boot only needs the tag.
	script.type = "text/plain";
	script.setAttribute(
		"src",
		`https://js.prosopo.io/js/procaptcha.bundle.js${query}`,
	);
	document.head.appendChild(script);
	return script;
};

beforeEach(() => {
	vi.resetModules();
	vi.clearAllMocks();
	document.head.innerHTML = "";
	document.body.innerHTML = "";
	mocks.createWidgets.mockImplementation(async (containers: Element[]) =>
		containers.map(() => ({
			handle: { destroy: vi.fn<() => void>() },
			container: document.createElement("div"),
		})),
	);
});

afterEach(() => {
	Reflect.deleteProperty(window, "onProcaptchaLoad");
});

// The first import of the entry point transforms its whole dependency graph.
describe("boot after the page has loaded", { timeout: 60_000 }, () => {
	it("renders implicit widgets once when the script's load event follows", async () => {
		expect(document.readyState).toBe("complete");
		const widget = document.createElement("div");
		widget.className = "procaptcha";
		widget.setAttribute("data-sitekey", SITE_KEY);
		document.body.appendChild(widget);
		const script = injectScript("");

		await import("../index.js");
		script.dispatchEvent(new Event("load"));
		await flush();

		expect(mocks.createWidgets).toHaveBeenCalledTimes(1);
	});

	it("calls the onload callback once when the script's load event follows", async () => {
		const onload = vi.fn<() => void>();
		Reflect.set(window, "onProcaptchaLoad", onload);
		const script = injectScript("?render=explicit&onload=onProcaptchaLoad");

		await import("../index.js");
		script.dispatchEvent(new Event("load"));
		await flush();

		expect(onload).toHaveBeenCalledTimes(1);
	});

	it("still boots from the load event when the page is still loading", async () => {
		const readyState = vi
			.spyOn(document, "readyState", "get")
			.mockReturnValue("interactive");
		const onload = vi.fn<() => void>();
		Reflect.set(window, "onProcaptchaLoad", onload);
		const script = injectScript("?render=explicit&onload=onProcaptchaLoad");

		await import("../index.js");
		expect(onload).not.toHaveBeenCalled();
		readyState.mockRestore();
		script.dispatchEvent(new Event("load"));
		await flush();

		expect(onload).toHaveBeenCalledTimes(1);
	});
});
