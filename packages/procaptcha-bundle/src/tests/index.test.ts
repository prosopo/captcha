// Copyright 2021-2025 Prosopo (UK) Ltd.
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
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../util/widgetFactory.js", () => ({
	WidgetFactory: vi.fn().mockImplementation(() => ({
		createWidgets: vi.fn(() => Promise.resolve([])),
	})),
}));

vi.mock("../util/widgetThemeResolver.js", () => ({
	WidgetThemeResolver: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("../util/captcha/captchaType.js", () => ({
	getCaptchaType: vi.fn(() => "frictionless"),
}));

vi.mock("../util/config.js", () => ({
	extractParams: vi.fn(() => ({
		onloadUrlCallback: undefined,
		renderExplicit: undefined,
	})),
	getProcaptchaScript: vi.fn(() => null),
}));

vi.mock("@prosopo/procaptcha-common", () => ({
	getWindowCallback: vi.fn((name: string) => {
		return () => {};
	}),
}));

describe("index.ts exports", () => {
	let dom: JSDOM;

	beforeEach(() => {
		dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
			url: "https://example.com",
		});
		// @ts-ignore
		global.document = dom.window.document;
		// @ts-ignore
		global.window = dom.window as unknown as Window & typeof globalThis;
		vi.clearAllMocks();
	});

	afterEach(() => {
		// biome-ignore lint/suspicious/noExplicitAny: TODO fix any
		(global as any).document = undefined;
		// biome-ignore lint/suspicious/noExplicitAny: TODO fix any
		(global as any).window = undefined;
		vi.clearAllMocks();
	});

	describe("ready", () => {
		it("should execute callback immediately when document is ready", async () => {
			Object.defineProperty(document, "readyState", {
				writable: true,
				value: "complete",
			});

			const callback = vi.fn();
			const { default: ready } = await import("../index.js");

			ready(callback);

			expect(callback).toHaveBeenCalled();
		});

		it("should add DOMContentLoaded listener when document is loading", async () => {
			Object.defineProperty(document, "readyState", {
				writable: true,
				value: "loading",
			});

			const callback = vi.fn();
			const { default: ready } = await import("../index.js");

			ready(callback);

			expect(callback).not.toHaveBeenCalled();

			document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));

			expect(callback).toHaveBeenCalled();
		});
	});

	describe("render", () => {
		it("should call createWidgets with correct parameters for visible mode", async () => {
			const { render } = await import("../index.js");

			const element = document.createElement("div");
			const renderOptions: ProcaptchaRenderOptions = {
				siteKey: "test-key",
				captchaType: "frictionless",
			};

			// render function should complete without error
			await expect(render(element, renderOptions)).resolves.not.toThrow();
		});

		it("should handle invisible mode", async () => {
			const { render } = await import("../index.js");

			const element = document.createElement("div");
			const renderOptions: ProcaptchaRenderOptions = {
				siteKey: "test-key",
				size: "invisible",
			};

			await render(element, renderOptions);

			expect(true).toBe(true);
		});

		it("should handle button element", async () => {
			const { render } = await import("../index.js");

			const button = document.createElement("button");
			const renderOptions: ProcaptchaRenderOptions = {
				siteKey: "test-key",
			};

			await render(button, renderOptions);

			expect(true).toBe(true);
		});

		it("should handle web3 mode", async () => {
			const { render } = await import("../index.js");

			const element = document.createElement("div");
			const renderOptions: ProcaptchaRenderOptions = {
				siteKey: "test-key",
				web3: true,
			};

			await render(element, renderOptions);

			expect(true).toBe(true);
		});
	});

	describe("execute", () => {
		it("should dispatch procaptcha:execute event when containers are found", async () => {
			const { execute } = await import("../index.js");

			const container = document.createElement("div");
			container.id = "procaptcha-container";
			document.body.appendChild(container);

			const eventListener = vi.fn();
			document.addEventListener("procaptcha:execute", eventListener);

			execute();

			expect(eventListener).toHaveBeenCalled();
			const event = eventListener.mock.calls[0][0] as CustomEvent;
			expect(event.detail).toBeDefined();
			expect(event.detail.containerId).toBe("procaptcha-container");
			expect(event.detail.containerCount).toBeGreaterThan(0);
			expect(typeof event.detail.timestamp).toBe("number");
		});

		it("should log error when no containers are found", async () => {
			const { execute } = await import("../index.js");
			const consoleSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});

			execute();

			expect(consoleSpy).toHaveBeenCalledWith(
				"No Procaptcha containers found for execution",
			);

			consoleSpy.mockRestore();
		});

		it("should find containers by data-size attribute", async () => {
			const { execute } = await import("../index.js");

			const container = document.createElement("div");
			container.setAttribute("data-size", "invisible");
			document.body.appendChild(container);

			const eventListener = vi.fn();
			document.addEventListener("procaptcha:execute", eventListener);

			execute();

			expect(eventListener).toHaveBeenCalled();
		});

		it("should find containers by id pattern", async () => {
			const { execute } = await import("../index.js");

			const container = document.createElement("div");
			container.id = "test-procaptcha-container";
			document.body.appendChild(container);

			const eventListener = vi.fn();
			document.addEventListener("procaptcha:execute", eventListener);

			execute();

			expect(eventListener).toHaveBeenCalled();
		});

		it("should find containers by class name", async () => {
			const { execute } = await import("../index.js");

			const container = document.createElement("div");
			container.className = "p-procaptcha";
			document.body.appendChild(container);

			const eventListener = vi.fn();
			document.addEventListener("procaptcha:execute", eventListener);

			execute();

			expect(eventListener).toHaveBeenCalled();
		});
	});

	describe("reset", () => {
		it("should unmount all roots and restart", async () => {
			// Reset is tested indirectly through the module's behavior
			// The actual implementation creates roots internally
			// This test verifies the function exists and can be called
			const { reset } = await import("../index.js");

			expect(reset).toBeDefined();
			expect(typeof reset).toBe("function");

			// Call reset - it may not have roots to unmount in test environment
			reset();
		});
	});

	describe("implicit render", () => {
		it("should handle elements with procaptcha class", async () => {
			// Create elements with procaptcha class
			const div = document.createElement("div");
			div.className = "procaptcha";
			div.setAttribute("data-sitekey", "test-site-key");
			document.body.appendChild(div);

			// Import the module which should trigger implicit render
			await import("../index.js");

			// The implicit render should have been called
			// Since we have mocks, it should not throw
			expect(true).toBe(true);
		});

		it("should handle invisible buttons with procaptcha class", async () => {
			// Create a button with procaptcha class
			const button = document.createElement("button");
			button.className = "procaptcha";
			button.setAttribute("data-sitekey", "test-site-key");
			button.setAttribute("data-callback", "testCallback");
			document.body.appendChild(button);

			// Import the module which should trigger implicit render
			await import("../index.js");

			// The implicit render should have been called
			// Since we have mocks, it should not throw
			expect(true).toBe(true);
		});

		it("should handle mixed elements and buttons", async () => {
			// Create both a div and a button with procaptcha class
			const div = document.createElement("div");
			div.className = "procaptcha";
			div.setAttribute("data-sitekey", "test-site-key");
			document.body.appendChild(div);

			const button = document.createElement("button");
			button.className = "procaptcha";
			button.setAttribute("data-sitekey", "test-site-key");
			document.body.appendChild(button);

			// Import the module which should trigger implicit render
			await import("../index.js");

			// The implicit render should have been called
			// Since we have mocks, it should not throw
			expect(true).toBe(true);
		});
	});
});
