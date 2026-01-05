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

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/svelte";
import ProcaptchaComponent from "./procaptchaComponent.svelte";
import type { ProcaptchaRenderOptions } from "@prosopo/procaptcha-wrapper";
import { renderProcaptcha } from "@prosopo/procaptcha-wrapper";

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
		const { container } = render(ProcaptchaComponent, {
			props: {
				siteKey: "test-site-key",
			},
		});
		const div = container.querySelector("div");
		expect(div).toBeTruthy();
	});

	it("should call renderProcaptcha with element and options after mount", async () => {
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
});

