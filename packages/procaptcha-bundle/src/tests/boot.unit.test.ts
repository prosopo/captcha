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
const BUNDLE_LOADED = Symbol.for("@prosopo/procaptcha-bundle/loaded");

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

const addWidgetElement = (): HTMLDivElement => {
	const widget = document.createElement("div");
	widget.className = "procaptcha";
	widget.setAttribute("data-sitekey", SITE_KEY);
	document.body.appendChild(widget);
	return widget;
};

const setOnloadCallback = (): ReturnType<typeof vi.fn<() => void>> => {
	const onload = vi.fn<() => void>();
	Reflect.set(window, "onProcaptchaLoad", onload);
	return onload;
};

const stillLoading = (): void => {
	vi.spyOn(document, "readyState", "get").mockReturnValue("loading");
};

const finishLoading = (): void => {
	vi.restoreAllMocks();
	document.dispatchEvent(new Event("DOMContentLoaded"));
};

const loadBundle = async (): Promise<void> => {
	vi.resetModules();
	await import("../index.js");
	await flush();
};

beforeEach(() => {
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
	vi.restoreAllMocks();
	Reflect.deleteProperty(window, "onProcaptchaLoad");
	Reflect.deleteProperty(window, "procaptcha");
	Reflect.deleteProperty(window, BUNDLE_LOADED);
});

// The first import of the entry point transforms its whole dependency graph.
describe("boot", { timeout: 60_000 }, () => {
	it("renders implicit widgets once when added after page load", async () => {
		expect(document.readyState).toBe("complete");
		addWidgetElement();
		const script = injectScript("");

		await loadBundle();
		script.dispatchEvent(new Event("load"));
		await flush();

		expect(mocks.createWidgets).toHaveBeenCalledTimes(1);
	});

	it("calls the onload callback once when added after page load", async () => {
		const onload = setOnloadCallback();
		const script = injectScript("?render=explicit&onload=onProcaptchaLoad");

		await loadBundle();
		script.dispatchEvent(new Event("load"));
		await flush();

		expect(onload).toHaveBeenCalledTimes(1);
	});

	it("renders implicit widgets and calls onload once each from one script", async () => {
		addWidgetElement();
		const onload = setOnloadCallback();
		injectScript("?onload=onProcaptchaLoad");

		await loadBundle();

		expect(mocks.createWidgets).toHaveBeenCalledTimes(1);
		expect(onload).toHaveBeenCalledTimes(1);
	});

	it("waits for the DOM when the page is still loading", async () => {
		stillLoading();
		addWidgetElement();
		const onload = setOnloadCallback();
		const script = injectScript("?onload=onProcaptchaLoad");

		await loadBundle();
		script.dispatchEvent(new Event("load"));
		expect(mocks.createWidgets).not.toHaveBeenCalled();
		expect(onload).not.toHaveBeenCalled();

		finishLoading();
		await flush();

		expect(mocks.createWidgets).toHaveBeenCalledTimes(1);
		expect(onload).toHaveBeenCalledTimes(1);
	});

	it("renders while the page is loading even when its script tag can't be found", async () => {
		stillLoading();
		addWidgetElement();

		await loadBundle();
		finishLoading();
		await flush();

		expect(mocks.createWidgets).toHaveBeenCalledTimes(1);
	});
});

describe(
	"a second copy of the bundle on the same page",
	{ timeout: 60_000 },
	() => {
		it("does not render widgets the first copy already rendered", async () => {
			addWidgetElement();
			injectScript("");

			await loadBundle();
			await loadBundle();

			expect(mocks.createWidgets).toHaveBeenCalledTimes(1);
		});

		it("renders widgets added since the first copy loaded", async () => {
			addWidgetElement();
			injectScript("");
			await loadBundle();

			const added = addWidgetElement();
			await loadBundle();

			expect(mocks.createWidgets).toHaveBeenCalledTimes(2);
			expect(mocks.createWidgets.mock.lastCall?.[0]).toEqual([added]);
		});

		it("renders a widget again after the first copy removed it", async () => {
			addWidgetElement();
			injectScript("");
			await loadBundle();

			window.procaptcha.remove();
			await loadBundle();

			expect(mocks.createWidgets).toHaveBeenCalledTimes(2);
		});

		it("keeps the first copy's window.procaptcha", async () => {
			injectScript("");
			await loadBundle();
			const first = window.procaptcha;

			await loadBundle();

			expect(window.procaptcha).toBe(first);
		});

		it("still calls its own onload callback", async () => {
			const onload = setOnloadCallback();
			injectScript("?render=explicit&onload=onProcaptchaLoad");

			await loadBundle();
			await loadBundle();

			expect(onload).toHaveBeenCalledTimes(2);
		});
	},
);
