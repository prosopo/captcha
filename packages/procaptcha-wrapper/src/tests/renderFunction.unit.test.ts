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
import { loadRenderFunction, type RendererFunction } from "../render/renderFunction.js";

describe("renderFunction", () => {
	beforeEach(() => {
		// Clear document head
		document.head.innerHTML = "";
		// Reset window.procaptcha
		// biome-ignore lint/suspicious/noExplicitAny: Test setup
		delete (window as any).procaptcha;
	});

	afterEach(() => {
		// Clean up
		document.head.innerHTML = "";
		// biome-ignore lint/suspicious/noExplicitAny: Test cleanup
		delete (window as any).procaptcha;
		vi.restoreAllMocks();
	});

	describe("loadRenderFunction", () => {
		it("should load script and return render function when procaptcha.render exists", async () => {
			const mockRender: RendererFunction = vi.fn();
			// biome-ignore lint/suspicious/noExplicitAny: Test setup
			(window as any).procaptcha = { render: mockRender };

			const scriptUrl = "https://example.com/script.js";
			const scriptId = "test-script-id";

			// Mock script loading by simulating onload
			const originalCreateElement = document.createElement.bind(document);
			vi.spyOn(document, "createElement").mockImplementation((tagName) => {
				const element = originalCreateElement(tagName);
				if (tagName === "script") {
					// Simulate successful script load
					setTimeout(() => {
						if (element.onload) {
							element.onload({} as Event);
						}
					}, 0);
				}
				return element;
			});

			const result = await loadRenderFunction(scriptUrl, scriptId);

			expect(result).toBe(mockRender);
			expect(document.querySelector(`#${scriptId}`)).toBeTruthy();
		});

		it("should throw error when procaptcha.render is undefined after script loads", async () => {
			const scriptUrl = "https://example.com/script.js";
			const scriptId = "test-script-id";

			// Mock script loading
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

			await expect(loadRenderFunction(scriptUrl, scriptId)).rejects.toThrow(
				"Render script does not contain the render function",
			);
		});

		it("should handle script load error", async () => {
			const scriptUrl = "https://example.com/script.js";
			const scriptId = "test-script-id";

			// Mock script loading with error
			const originalCreateElement = document.createElement.bind(document);
			vi.spyOn(document, "createElement").mockImplementation((tagName) => {
				const element = originalCreateElement(tagName);
				if (tagName === "script") {
					setTimeout(() => {
						if (element.onerror) {
							element.onerror("Network error" as any);
						}
					}, 0);
				}
				return element;
			});

			await expect(loadRenderFunction(scriptUrl, scriptId)).rejects.toBe(
				"Network error",
			);
		});

		it("should set script attributes correctly", async () => {
			const mockRender: RendererFunction = vi.fn();
			// biome-ignore lint/suspicious/noExplicitAny: Test setup
			(window as any).procaptcha = { render: mockRender };

			const scriptUrl = "https://example.com/script.js";
			const scriptId = "test-script-id";

			let capturedScript: HTMLScriptElement | null = null;
			const originalCreateElement = document.createElement.bind(document);
			vi.spyOn(document, "createElement").mockImplementation((tagName) => {
				const element = originalCreateElement(tagName);
				if (tagName === "script") {
					capturedScript = element as HTMLScriptElement;
					setTimeout(() => {
						if (element.onload) {
							element.onload({} as Event);
						}
					}, 0);
				}
				return element;
			});

			await loadRenderFunction(scriptUrl, scriptId);

			expect(capturedScript).toBeTruthy();
			expect(capturedScript?.src).toBe(scriptUrl);
			expect(capturedScript?.id).toBe(scriptId);
			expect(capturedScript?.type).toBe("module");
			expect(capturedScript?.async).toBe(true);
			expect(capturedScript?.defer).toBe(true);
		});

		it("should append script to document.head", async () => {
			const mockRender: RendererFunction = vi.fn();
			// biome-ignore lint/suspicious/noExplicitAny: Test setup
			(window as any).procaptcha = { render: mockRender };

			const scriptUrl = "https://example.com/script.js";
			const scriptId = "test-script-id";

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

			await loadRenderFunction(scriptUrl, scriptId);

			const script = document.querySelector(`#${scriptId}`);
			expect(script).toBeTruthy();
			expect(script?.parentElement).toBe(document.head);
		});

		it("should create new script element on each call", async () => {
			const mockRender: RendererFunction = vi.fn();
			// biome-ignore lint/suspicious/noExplicitAny: Test setup
			(window as any).procaptcha = { render: mockRender };

			const scriptUrl = "https://example.com/script.js";
			const scriptId = "test-script-id";

			const originalCreateElement = document.createElement.bind(document);
			let createElementCallCount = 0;
			vi.spyOn(document, "createElement").mockImplementation((tagName) => {
				const element = originalCreateElement(tagName);
				if (tagName === "script") {
					createElementCallCount++;
					setTimeout(() => {
						if (element.onload) {
							element.onload({} as Event);
						}
					}, 0);
				}
				return element;
			});

			// Load first time
			await loadRenderFunction(scriptUrl, scriptId);
			const firstCallCount = createElementCallCount;

			// Load second time - creates new script (loadRenderFunction doesn't cache)
			await loadRenderFunction(scriptUrl, scriptId);
			expect(createElementCallCount).toBeGreaterThan(firstCallCount);
		});

		it("should handle string error in onerror callback", async () => {
			const scriptUrl = "https://example.com/script.js";
			const scriptId = "test-script-id";

			const originalCreateElement = document.createElement.bind(document);
			vi.spyOn(document, "createElement").mockImplementation((tagName) => {
				const element = originalCreateElement(tagName);
				if (tagName === "script") {
					setTimeout(() => {
						if (element.onerror) {
							element.onerror("String error" as any);
						}
					}, 0);
				}
				return element;
			});

			await expect(loadRenderFunction(scriptUrl, scriptId)).rejects.toBe(
				"String error",
			);
		});

		it("should handle Event error in onerror callback", async () => {
			const scriptUrl = "https://example.com/script.js";
			const scriptId = "test-script-id";

			const originalCreateElement = document.createElement.bind(document);
			const errorEvent = new Event("error");
			vi.spyOn(document, "createElement").mockImplementation((tagName) => {
				const element = originalCreateElement(tagName);
				if (tagName === "script") {
					setTimeout(() => {
						if (element.onerror) {
							element.onerror(errorEvent);
						}
					}, 0);
				}
				return element;
			});

			await expect(loadRenderFunction(scriptUrl, scriptId)).rejects.toBe(
				errorEvent,
			);
		});
	});
});

