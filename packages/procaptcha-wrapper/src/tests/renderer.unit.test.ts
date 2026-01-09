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

import { describe, expect, it, vi } from "vitest";
import type { RendererFunction } from "../render/renderFunction.js";
import { createRenderer } from "../render/renderer.js";

describe("renderer", () => {
	describe("createRenderer", () => {
		it("should create a renderer function", () => {
			const settings = {
				scriptUrl: "https://example.com/script.js",
				scriptId: "test-script-id",
			};

			const renderer = createRenderer(settings);

			expect(typeof renderer).toBe("function");
		});

		it("should call loadRenderFunction only once and cache the result", async () => {
			const mockRenderFunction: RendererFunction = vi
				.fn()
				.mockResolvedValue(undefined);

			const settings = {
				scriptUrl: "https://example.com/script.js",
				scriptId: "test-script-id",
			};

			// biome-ignore lint/suspicious/noExplicitAny: Test setup
			(window as any).procaptcha = { render: mockRenderFunction };

			const originalCreateElement = document.createElement.bind(document);
			let scriptLoadCount = 0;
			vi.spyOn(document, "createElement").mockImplementation((tagName) => {
				const element = originalCreateElement(tagName);
				if (tagName === "script") {
					scriptLoadCount++;
					setTimeout(() => {
						if (element.onload) {
							element.onload({} as Event);
						}
					}, 0);
				}
				return element;
			});

			const renderer = createRenderer(settings);
			const element = document.createElement("div");
			const options = { siteKey: "test-key" };

			// Call renderer multiple times
			await renderer(element, options);
			await renderer(element, options);
			await renderer(element, options);

			// Script should only be loaded once due to caching in createRenderer
			expect(scriptLoadCount).toBe(1);
		});

		it("should clone options object before passing to render function", async () => {
			const mockRenderFunction: RendererFunction = vi
				.fn()
				.mockResolvedValue(undefined);

			const settings = {
				scriptUrl: "https://example.com/script.js",
				scriptId: "test-script-id",
			};

			// Mock window.procaptcha and script loading
			// biome-ignore lint/suspicious/noExplicitAny: Test setup
			(window as any).procaptcha = { render: mockRenderFunction };

			const originalCreateElement = document.createElement.bind(document);
			vi.spyOn(document, "createElement").mockImplementation((tagName) => {
				const element = originalCreateElement(tagName);
				if (tagName === "script") {
					setTimeout(() => {
						if (element.onload) {
							element.onload({} as Event);
						}
					}, 0);
				}
				return element;
			});

			const renderer = createRenderer(settings);
			const element = document.createElement("div");
			const originalOptions = { siteKey: "test-key" };
			const frozenOptions = Object.freeze(originalOptions);

			await renderer(element, frozenOptions);

			expect(mockRenderFunction).toHaveBeenCalledWith(
				element,
				expect.objectContaining({ siteKey: "test-key" }),
			);

			// Verify the options passed to render function is not the same object
			const callArgs = mockRenderFunction.mock.calls[0];
			expect(callArgs[1]).not.toBe(frozenOptions);
		});

		it("should pass element and options to render function", async () => {
			const mockRenderFunction: RendererFunction = vi
				.fn()
				.mockResolvedValue(undefined);

			const settings = {
				scriptUrl: "https://example.com/script.js",
				scriptId: "test-script-id",
			};

			// biome-ignore lint/suspicious/noExplicitAny: Test setup
			(window as any).procaptcha = { render: mockRenderFunction };

			const originalCreateElement = document.createElement.bind(document);
			vi.spyOn(document, "createElement").mockImplementation((tagName) => {
				const element = originalCreateElement(tagName);
				if (tagName === "script") {
					setTimeout(() => {
						if (element.onload) {
							element.onload({} as Event);
						}
					}, 0);
				}
				return element;
			});

			const renderer = createRenderer(settings);
			const element = document.createElement("div");
			const options = {
				siteKey: "test-key",
				theme: "dark" as const,
				captchaType: "image" as const,
			};

			await renderer(element, options);

			expect(mockRenderFunction).toHaveBeenCalledTimes(1);
			expect(mockRenderFunction).toHaveBeenCalledWith(
				element,
				expect.objectContaining({
					siteKey: "test-key",
					theme: "dark",
					captchaType: "image",
				}),
			);
		});

		it("should handle render function errors", async () => {
			const error = new Error("Render failed");
			const mockRenderFunction: RendererFunction = vi
				.fn()
				.mockRejectedValue(error);

			const settings = {
				scriptUrl: "https://example.com/script.js",
				scriptId: "test-script-id",
			};

			// biome-ignore lint/suspicious/noExplicitAny: Test setup
			(window as any).procaptcha = { render: mockRenderFunction };

			const originalCreateElement = document.createElement.bind(document);
			vi.spyOn(document, "createElement").mockImplementation((tagName) => {
				const element = originalCreateElement(tagName);
				if (tagName === "script") {
					setTimeout(() => {
						if (element.onload) {
							element.onload({} as Event);
						}
					}, 0);
				}
				return element;
			});

			const renderer = createRenderer(settings);
			const element = document.createElement("div");
			const options = { siteKey: "test-key" };

			await expect(renderer(element, options)).rejects.toThrow("Render failed");
		});

		it("should handle all ProcaptchaRenderOptions properties", async () => {
			const mockRenderFunction: RendererFunction = vi
				.fn()
				.mockResolvedValue(undefined);

			const settings = {
				scriptUrl: "https://example.com/script.js",
				scriptId: "test-script-id",
			};

			// biome-ignore lint/suspicious/noExplicitAny: Test setup
			(window as any).procaptcha = { render: mockRenderFunction };

			const originalCreateElement = document.createElement.bind(document);
			vi.spyOn(document, "createElement").mockImplementation((tagName) => {
				const element = originalCreateElement(tagName);
				if (tagName === "script") {
					setTimeout(() => {
						if (element.onload) {
							element.onload({} as Event);
						}
					}, 0);
				}
				return element;
			});

			const renderer = createRenderer(settings);
			const element = document.createElement("div");
			const options = {
				siteKey: "test-key",
				theme: "light" as const,
				captchaType: "pow" as const,
				callback: "testCallback",
				"challenge-valid-length": "300",
				"chalexpired-callback": "chalexpiredCallback",
				"expired-callback": "expiredCallback",
				"open-callback": "openCallback",
				"close-callback": "closeCallback",
				"error-callback": "errorCallback",
				"failed-callback": "failedCallback",
				"reset-callback": "resetCallback",
				language: "en" as const,
				size: "invisible" as const,
				web3: true,
				userAccountAddress: "0x123",
			};

			await renderer(element, options);

			expect(mockRenderFunction).toHaveBeenCalledWith(
				element,
				expect.objectContaining(options),
			);
		});

		it("should handle function callbacks in options", async () => {
			const mockRenderFunction: RendererFunction = vi
				.fn()
				.mockResolvedValue(undefined);

			const settings = {
				scriptUrl: "https://example.com/script.js",
				scriptId: "test-script-id",
			};

			// biome-ignore lint/suspicious/noExplicitAny: Test setup
			(window as any).procaptcha = { render: mockRenderFunction };

			const originalCreateElement = document.createElement.bind(document);
			vi.spyOn(document, "createElement").mockImplementation((tagName) => {
				const element = originalCreateElement(tagName);
				if (tagName === "script") {
					setTimeout(() => {
						if (element.onload) {
							element.onload({} as Event);
						}
					}, 0);
				}
				return element;
			});

			const renderer = createRenderer(settings);
			const element = document.createElement("div");
			const callback = vi.fn();
			const expiredCallback = vi.fn();
			const options = {
				siteKey: "test-key",
				callback,
				"expired-callback": expiredCallback,
			};

			await renderer(element, options);

			expect(mockRenderFunction).toHaveBeenCalledWith(
				element,
				expect.objectContaining({
					siteKey: "test-key",
					callback,
					"expired-callback": expiredCallback,
				}),
			);
		});
	});
});
