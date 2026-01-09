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

import type { ProcaptchaRenderOptions } from "@prosopo/procaptcha-wrapper";
import { renderProcaptcha } from "@prosopo/procaptcha-wrapper";
import { render, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProcaptchaComponent from "./procaptchaComponent.svelte";

// Mock renderProcaptcha
vi.mock("@prosopo/procaptcha-wrapper", () => ({
	renderProcaptcha: vi.fn(),
}));

describe("ProcaptchaComponent", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(renderProcaptcha).mockResolvedValue(undefined);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should render a div element", () => {
		// Test that the component creates a wrapper div element for the captcha
		const { container } = render(ProcaptchaComponent, {
			props: {
				siteKey: "test-site-key",
			},
		});
		const div = container.querySelector("div");
		expect(div).toBeTruthy();
	});

	it("should call renderProcaptcha with element and options after mount", async () => {
		// Test integration: component should call the underlying renderProcaptcha function
		// with the wrapper element and all provided options after Svelte's tick
		const options: ProcaptchaRenderOptions = {
			siteKey: "test-site-key",
		};

		const { container } = render(ProcaptchaComponent, {
			props: options,
		});

		await waitFor(() => {
			expect(renderProcaptcha).toHaveBeenCalled();
		});

		expect(renderProcaptcha).toHaveBeenCalledTimes(1);
		const [element, renderOptions] = vi.mocked(renderProcaptcha).mock.calls[0];
		expect(element).toBeInstanceOf(HTMLDivElement);
		expect(renderOptions).toEqual(options);
	});

	it("should apply htmlAttributes to the wrapper div", () => {
		const htmlAttributes = {
			class: "test-class",
			id: "test-id",
			"data-testid": "test-element",
		};

		const { container } = render(ProcaptchaComponent, {
			props: {
				siteKey: "test-site-key",
				htmlAttributes,
			},
		});

		const div = container.querySelector("div");
		expect(div?.getAttribute("class")).toBe("test-class");
		expect(div?.getAttribute("id")).toBe("test-id");
		expect(div?.getAttribute("data-testid")).toBe("test-element");
	});

	it("should handle empty htmlAttributes", () => {
		const { container } = render(ProcaptchaComponent, {
			props: {
				siteKey: "test-site-key",
				htmlAttributes: {},
			},
		});

		const div = container.querySelector("div");
		expect(div).toBeTruthy();
	});

	it("should handle undefined htmlAttributes", () => {
		const { container } = render(ProcaptchaComponent, {
			props: {
				siteKey: "test-site-key",
			},
		});

		const div = container.querySelector("div");
		expect(div).toBeTruthy();
	});

	it("should pass all ProcaptchaRenderOptions to renderProcaptcha", async () => {
		const options: ProcaptchaRenderOptions = {
			siteKey: "test-site-key",
			theme: "dark",
			captchaType: "image",
			language: "en",
			size: "invisible",
			web3: true,
			userAccountAddress: "0x1234567890abcdef",
		};

		render(ProcaptchaComponent, {
			props: options,
		});

		await waitFor(() => {
			expect(renderProcaptcha).toHaveBeenCalled();
		});

		const [, renderOptions] = vi.mocked(renderProcaptcha).mock.calls[0];
		expect(renderOptions).toEqual(options);
	});

	it("should handle callback functions in options", async () => {
		const callback = vi.fn();
		const options: ProcaptchaRenderOptions = {
			siteKey: "test-site-key",
			callback,
		};

		render(ProcaptchaComponent, {
			props: options,
		});

		await waitFor(() => {
			expect(renderProcaptcha).toHaveBeenCalled();
		});

		const [, renderOptions] = vi.mocked(renderProcaptcha).mock.calls[0];
		expect(renderOptions.callback).toBe(callback);
	});

	it("should handle string callbacks in options", async () => {
		const options: ProcaptchaRenderOptions = {
			siteKey: "test-site-key",
			callback: "window.myCallback",
		};

		render(ProcaptchaComponent, {
			props: options,
		});

		await waitFor(() => {
			expect(renderProcaptcha).toHaveBeenCalled();
		});

		const [, renderOptions] = vi.mocked(renderProcaptcha).mock.calls[0];
		expect(renderOptions.callback).toBe("window.myCallback");
	});

	it("should handle all callback types", async () => {
		const expiredCallback = vi.fn();
		const errorCallback = vi.fn();
		const options: ProcaptchaRenderOptions = {
			siteKey: "test-site-key",
			"expired-callback": expiredCallback,
			"error-callback": errorCallback,
			"open-callback": "window.open",
			"close-callback": () => {},
		};

		render(ProcaptchaComponent, {
			props: options,
		});

		await waitFor(() => {
			expect(renderProcaptcha).toHaveBeenCalled();
		});

		const [, renderOptions] = vi.mocked(renderProcaptcha).mock.calls[0];
		expect(renderOptions["expired-callback"]).toBe(expiredCallback);
		expect(renderOptions["error-callback"]).toBe(errorCallback);
		expect(renderOptions["open-callback"]).toBe("window.open");
		expect(typeof renderOptions["close-callback"]).toBe("function");
	});

	it("should wait for tick before calling renderProcaptcha", async () => {
		const options: ProcaptchaRenderOptions = {
			siteKey: "test-site-key",
		};

		render(ProcaptchaComponent, {
			props: options,
		});

		// Initially should not be called
		expect(renderProcaptcha).not.toHaveBeenCalled();

		// After waiting, it should be called
		await waitFor(
			() => {
				expect(renderProcaptcha).toHaveBeenCalled();
			},
			{ timeout: 1000 },
		);
	});

	it("should handle custom data attributes in htmlAttributes", () => {
		const htmlAttributes = {
			"data-custom": "custom-value",
			"data-another": "another-value",
		};

		const { container } = render(ProcaptchaComponent, {
			props: {
				siteKey: "test-site-key",
				htmlAttributes,
			},
		});

		const div = container.querySelector("div");
		expect(div?.getAttribute("data-custom")).toBe("custom-value");
		expect(div?.getAttribute("data-another")).toBe("another-value");
	});

	it("should support all valid ProcaptchaRenderOptions combinations", async () => {
		// Test integration: component should pass through all possible ProcaptchaRenderOptions
		// including complex combinations of callbacks, themes, and web3 settings
		const comprehensiveOptions: ProcaptchaRenderOptions = {
			siteKey: "test-site-key",
			theme: "dark",
			captchaType: "pow",
			language: "es",
			size: "compact",
			web3: true,
			userAccountAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
			callback: () => {},
			"expired-callback": () => {},
			"error-callback": () => {},
			"open-callback": () => {},
			"close-callback": () => {},
		};

		render(ProcaptchaComponent, {
			props: comprehensiveOptions,
		});

		await waitFor(() => {
			expect(renderProcaptcha).toHaveBeenCalled();
		});

		const [, renderOptions] = vi.mocked(renderProcaptcha).mock.calls[0];
		expect(renderOptions).toEqual(comprehensiveOptions);
	});

	it("should merge htmlAttributes with component styles", () => {
		// Test that htmlAttributes work alongside any future component styles
		const htmlAttributes = {
			class: "custom-class",
			style: "color: red;",
			"data-testid": "procaptcha",
		};

		const { container } = render(ProcaptchaComponent, {
			props: {
				siteKey: "test-site-key",
				htmlAttributes,
			},
		});

		const div = container.querySelector("div");
		expect(div?.getAttribute("class")).toBe("custom-class");
		expect(div?.getAttribute("style")).toBe("color: red;");
		expect(div?.getAttribute("data-testid")).toBe("procaptcha");
	});

	it("should handle complex htmlAttributes combinations", () => {
		// Test various HTML attribute combinations
		const htmlAttributes = {
			id: "procaptcha-widget",
			class: "captcha-wrapper dark-theme",
			"data-site-key": "test-site-key",
			"aria-label": "Procaptcha verification",
			role: "region",
			tabindex: -1,
			style: "margin: 10px; padding: 5px;",
		};

		const { container } = render(ProcaptchaComponent, {
			props: {
				siteKey: "test-site-key",
				htmlAttributes,
			},
		});

		const div = container.querySelector("div");
		expect(div?.getAttribute("id")).toBe("procaptcha-widget");
		expect(div?.getAttribute("class")).toBe("captcha-wrapper dark-theme");
		expect(div?.getAttribute("data-site-key")).toBe("test-site-key");
		expect(div?.getAttribute("aria-label")).toBe("Procaptcha verification");
		expect(div?.getAttribute("role")).toBe("region");
		expect(div?.getAttribute("tabindex")).toBe("-1");
		expect(div?.getAttribute("style")).toBe("margin: 10px; padding: 5px;");
	});

	it("should handle boolean and number attributes in htmlAttributes", () => {
		const htmlAttributes = {
			disabled: true,
			hidden: false,
			"data-count": 42,
			contenteditable: "true",
		};

		const { container } = render(ProcaptchaComponent, {
			props: {
				siteKey: "test-site-key",
				htmlAttributes,
			},
		});

		const div = container.querySelector("div");
		expect(div?.getAttribute("disabled")).toBe("true");
		expect(div?.hasAttribute("hidden")).toBe(false); // false values are not set
		expect(div?.getAttribute("data-count")).toBe("42");
		expect(div?.getAttribute("contenteditable")).toBe("true");
	});
});
