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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RendererFunction } from "../render/renderFunction.js";
import { renderProcaptcha } from "../index.js";

describe("index", () => {
	beforeEach(() => {
		// Clear document head
		document.head.innerHTML = "";
		// Reset window.procaptcha - must be set before renderProcaptcha is called
		// because the renderer caches the render function
		// biome-ignore lint/suspicious/noExplicitAny: Test setup
		delete (window as any).procaptcha;
	});

	afterEach(() => {
		// Clean up
		document.head.innerHTML = "";
		// biome-ignore lint/suspicious/noExplicitAny: Test cleanup
		delete (window as any).procaptcha;
	});

	describe("renderProcaptcha", () => {
		it("should be a function", () => {
			expect(typeof renderProcaptcha).toBe("function");
		});

		it("should render procaptcha with valid element and options", async () => {
			const mockRenderFunction: RendererFunction = vi.fn().mockResolvedValue(
				undefined,
			);

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

			const element = document.createElement("div");
			const options = { siteKey: "test-site-key" };

			await renderProcaptcha(element, options);

			expect(mockRenderFunction).toHaveBeenCalledTimes(1);
		});

		it("should handle different element types", async () => {
			const mockRenderFunction: RendererFunction = vi.fn().mockResolvedValue(
				undefined,
			);

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

			const divElement = document.createElement("div");
			const spanElement = document.createElement("span");
			const sectionElement = document.createElement("section");
			const options = { siteKey: "test-site-key" };

			// Renderer caches the render function, so all calls use the same cached function
			// Wait for script to load on first call
			await renderProcaptcha(divElement, options);
			// Subsequent calls use cached render function, no script loading needed
			await renderProcaptcha(spanElement, options);
			await renderProcaptcha(sectionElement, options);

			expect(mockRenderFunction).toHaveBeenCalledTimes(3);
		});

		it("should handle minimal options with only siteKey", async () => {
			const mockRenderFunction: RendererFunction = vi.fn().mockResolvedValue(
				undefined,
			);

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

			const element = document.createElement("div");
			const options = { siteKey: "minimal-key" };

			await renderProcaptcha(element, options);

			expect(mockRenderFunction).toHaveBeenCalledWith(
				element,
				expect.objectContaining({ siteKey: "minimal-key" }),
			);
		});

		it("should handle options with all optional properties", async () => {
			const mockRenderFunction: RendererFunction = vi.fn().mockResolvedValue(
				undefined,
			);

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

			const element = document.createElement("div");
			const options = {
				siteKey: "full-options-key",
				theme: "dark" as const,
				captchaType: "frictionless" as const,
				callback: vi.fn(),
				"challenge-valid-length": "600",
				"chalexpired-callback": vi.fn(),
				"expired-callback": vi.fn(),
				"open-callback": vi.fn(),
				"close-callback": vi.fn(),
				"error-callback": vi.fn(),
				"failed-callback": vi.fn(),
				"reset-callback": vi.fn(),
				language: "fr" as const,
				size: "invisible" as const,
				web3: false,
				userAccountAddress: "0xabcdef",
			};

			await renderProcaptcha(element, options);

			expect(mockRenderFunction).toHaveBeenCalledWith(
				element,
				expect.objectContaining(options),
			);
		});

		it("should handle script loading errors", async () => {
			// Clear any cached render function by ensuring window.procaptcha is not set
			// biome-ignore lint/suspicious/noExplicitAny: Test setup
			delete (window as any).procaptcha;

			const originalCreateElement = document.createElement.bind(document);
			vi.spyOn(document, "createElement").mockImplementation((tagName) => {
				const element = originalCreateElement(tagName);
				if (tagName === "script") {
					setTimeout(() => {
						if (element.onerror) {
							element.onerror("Script load failed" as any);
						}
					}, 0);
				}
				return element;
			});

			const element = document.createElement("div");
			const options = { siteKey: "test-key" };

			await expect(renderProcaptcha(element, options)).rejects.toBe(
				"Script load failed",
			);
		});

		it("should handle missing render function error", async () => {
			// Clear any cached render function by ensuring window.procaptcha is not set
			// biome-ignore lint/suspicious/noExplicitAny: Test setup
			delete (window as any).procaptcha;

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

			const element = document.createElement("div");
			const options = { siteKey: "test-key" };

			await expect(renderProcaptcha(element, options)).rejects.toThrow(
				"Render script does not contain the render function",
			);
		});

		it("should clone options to prevent modification of original", async () => {
			const mockRenderFunction: RendererFunction = vi.fn().mockResolvedValue(
				undefined,
			);

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

			const element = document.createElement("div");
			const originalOptions = { siteKey: "test-key" };
			const frozenOptions = Object.freeze(originalOptions);

			await renderProcaptcha(element, frozenOptions);

			expect(mockRenderFunction).toHaveBeenCalled();
			const callArgs = mockRenderFunction.mock.calls[0];
			expect(callArgs[1]).not.toBe(frozenOptions);
		});
	});
});

