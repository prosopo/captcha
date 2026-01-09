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
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Angular decorators before importing the component
vi.mock("@angular/core", () => {
	const ElementRef = class {
		constructor(public nativeElement: HTMLElement) {}
	};

	return {
		Component: vi.fn(() => (target: unknown) => target),
		Input: vi.fn(() => (target: unknown, propertyKey: string) => {
			// Decorator that does nothing - just returns
			if (target && typeof target === "object") {
				// Property is already defined by the class, no need to redefine
			}
		}),
		inject: vi.fn((token: unknown) => {
			// Return a mock ElementRef when inject is called
			const mockElement = document.createElement("div");
			return new ElementRef(mockElement);
		}),
		ElementRef,
	};
});

// Mock the renderProcaptcha function
vi.mock("@prosopo/procaptcha-wrapper", () => ({
	renderProcaptcha: vi.fn(),
}));

import type { ElementRef } from "@angular/core";
import { renderProcaptcha } from "@prosopo/procaptcha-wrapper";
import { ProcaptchaComponent } from "./procaptcha.component.js";

const mockRenderProcaptcha = vi.mocked(renderProcaptcha);

describe("ProcaptchaComponent", () => {
	let component: ProcaptchaComponent;
	let mockElementRef: ElementRef<HTMLElement>;
	let mockNativeElement: HTMLElement;

	beforeEach(() => {
		vi.clearAllMocks();

		// Create a mock native element
		mockNativeElement = document.createElement("div");
		mockNativeElement.setAttribute = vi.fn();
		mockNativeElement.removeAttribute = vi.fn();
		// Mock the attributes property to return an empty array-like object
		Object.defineProperty(mockNativeElement, "attributes", {
			value: [],
			writable: true,
			configurable: true,
		});

		// Create a mock ElementRef
		mockElementRef = {
			nativeElement: mockNativeElement,
		} as ElementRef<HTMLElement>;

		// Create component instance
		component = new ProcaptchaComponent();
		component.elementRef = mockElementRef;
	});

	describe("component initialization", () => {
		it("should initialize with default htmlAttributes as empty object", () => {
			// Testing that the component initializes with empty htmlAttributes by default
			expect(component.htmlAttributes).toEqual({});
		});

		it("should have elementRef injected", () => {
			// Testing that the ElementRef dependency injection works correctly
			expect(component.elementRef).toBeDefined();
		});

		it("should have nativeElement available through elementRef", () => {
			// Testing that the injected ElementRef provides access to the native DOM element
			expect(component.elementRef.nativeElement).toBeInstanceOf(HTMLElement);
		});
	});

	describe("ngOnInit", () => {
		it("should call render when ngOnInit is called", () => {
			const settings: ProcaptchaRenderOptions = {
				siteKey: "test-site-key",
			};
			component.settings = settings;

			// biome-ignore lint/suspicious/noExplicitAny: Need to spy on private method for testing
			const renderSpy = vi.spyOn(component as any, "render");

			component.ngOnInit();

			expect(renderSpy).toHaveBeenCalledTimes(1);
		});

		it("should render procaptcha with correct settings on init", async () => {
			const settings: ProcaptchaRenderOptions = {
				siteKey: "test-site-key",
				theme: "light",
			};
			component.settings = settings;
			mockRenderProcaptcha.mockResolvedValue(undefined);

			component.ngOnInit();

			await vi.waitFor(() => {
				expect(mockRenderProcaptcha).toHaveBeenCalledWith(
					mockNativeElement,
					settings,
				);
			});
		});
	});

	describe("ngOnChanges", () => {
		it("should call render when ngOnChanges is called", () => {
			const settings: ProcaptchaRenderOptions = {
				siteKey: "test-site-key",
			};
			component.settings = settings;

			// biome-ignore lint/suspicious/noExplicitAny: Need to spy on private method for testing
			const renderSpy = vi.spyOn(component as any, "render");

			component.ngOnChanges();

			expect(renderSpy).toHaveBeenCalledTimes(1);
		});

		it("should render procaptcha with updated settings on changes", async () => {
			const initialSettings: ProcaptchaRenderOptions = {
				siteKey: "initial-site-key",
			};
			component.settings = initialSettings;

			const updatedSettings: ProcaptchaRenderOptions = {
				siteKey: "updated-site-key",
				theme: "dark",
			};
			component.settings = updatedSettings;
			mockRenderProcaptcha.mockResolvedValue(undefined);

			component.ngOnChanges();

			await vi.waitFor(() => {
				expect(mockRenderProcaptcha).toHaveBeenCalledWith(
					mockNativeElement,
					updatedSettings,
				);
			});
		});
	});

	describe("render", () => {
		it("should set HTML attributes on native element", async () => {
			const settings: ProcaptchaRenderOptions = {
				siteKey: "test-site-key",
			};
			component.settings = settings;
			component.htmlAttributes = {
				id: "test-id",
				class: "test-class",
				"data-test": "test-value",
			};
			mockRenderProcaptcha.mockResolvedValue(undefined);

			component.ngOnInit();

			await vi.waitFor(() => {
				expect(mockNativeElement.setAttribute).toHaveBeenCalledWith(
					"id",
					"test-id",
				);
				expect(mockNativeElement.setAttribute).toHaveBeenCalledWith(
					"class",
					"test-class",
				);
				expect(mockNativeElement.setAttribute).toHaveBeenCalledWith(
					"data-test",
					"test-value",
				);
			});
		});

		it("should not set attributes when htmlAttributes is empty", async () => {
			const settings: ProcaptchaRenderOptions = {
				siteKey: "test-site-key",
			};
			component.settings = settings;
			component.htmlAttributes = {};
			mockRenderProcaptcha.mockResolvedValue(undefined);

			component.ngOnInit();

			await vi.waitFor(() => {
				expect(mockNativeElement.setAttribute).not.toHaveBeenCalled();
			});
		});

		it("should call renderProcaptcha with native element and settings", async () => {
			const settings: ProcaptchaRenderOptions = {
				siteKey: "test-site-key",
				theme: "light",
				captchaType: "pow",
			};
			component.settings = settings;
			mockRenderProcaptcha.mockResolvedValue(undefined);

			component.ngOnInit();

			await vi.waitFor(() => {
				expect(mockRenderProcaptcha).toHaveBeenCalledWith(
					mockNativeElement,
					settings,
				);
			});
		});

		it("should handle settings with all optional properties", async () => {
			const callback = vi.fn();
			const settings: ProcaptchaRenderOptions = {
				siteKey: "test-site-key",
				theme: "dark",
				captchaType: "frictionless",
				callback: callback,
				"challenge-valid-length": "300",
				"chalexpired-callback": vi.fn(),
				"expired-callback": vi.fn(),
				"open-callback": vi.fn(),
				"close-callback": vi.fn(),
				"error-callback": vi.fn(),
			};
			component.settings = settings;
			mockRenderProcaptcha.mockResolvedValue(undefined);

			component.ngOnInit();

			await vi.waitFor(() => {
				expect(mockRenderProcaptcha).toHaveBeenCalledWith(
					mockNativeElement,
					settings,
				);
			});
		});

		it("should handle settings with string callbacks", async () => {
			const settings: ProcaptchaRenderOptions = {
				siteKey: "test-site-key",
				callback: "window.myCallback",
				"expired-callback": "window.myExpiredCallback",
			};
			component.settings = settings;
			mockRenderProcaptcha.mockResolvedValue(undefined);

			component.ngOnInit();

			await vi.waitFor(() => {
				expect(mockRenderProcaptcha).toHaveBeenCalledWith(
					mockNativeElement,
					settings,
				);
			});
		});

		it("should set multiple HTML attributes correctly", async () => {
			const settings: ProcaptchaRenderOptions = {
				siteKey: "test-site-key",
			};
			component.settings = settings;
			component.htmlAttributes = {
				id: "procaptcha-1",
				class: "procaptcha-container",
				"data-sitekey": "test-site-key",
				"aria-label": "Procaptcha widget",
			};
			mockRenderProcaptcha.mockResolvedValue(undefined);

			component.ngOnInit();

			await vi.waitFor(() => {
				expect(mockNativeElement.setAttribute).toHaveBeenCalledTimes(4);
			});
		});

		it("should handle render being called multiple times", async () => {
			const settings: ProcaptchaRenderOptions = {
				siteKey: "test-site-key",
			};
			component.settings = settings;
			mockRenderProcaptcha.mockResolvedValue(undefined);

			component.ngOnInit();
			component.ngOnChanges();

			await vi.waitFor(() => {
				expect(mockRenderProcaptcha).toHaveBeenCalledTimes(2);
			});
		});

		it("should call renderProcaptcha even when it rejects", async () => {
			// Testing that renderProcaptcha is called even when it fails
			const settings: ProcaptchaRenderOptions = {
				siteKey: "test-site-key",
			};
			component.settings = settings;
			mockRenderProcaptcha.mockRejectedValue(new Error("Render failed"));

			// The component doesn't handle errors, but should still attempt to render
			component.ngOnInit();

			await vi.waitFor(() => {
				expect(mockRenderProcaptcha).toHaveBeenCalledWith(
					mockNativeElement,
					settings,
				);
			});
		});
	});

	it("should update HTML attributes when htmlAttributes changes", async () => {
		const settings: ProcaptchaRenderOptions = {
			siteKey: "test-site-key",
		};
		component.settings = settings;
		component.htmlAttributes = {
			id: "initial-id",
		};
		mockRenderProcaptcha.mockResolvedValue(undefined);

		component.ngOnInit();

		await vi.waitFor(() => {
			expect(mockNativeElement.setAttribute).toHaveBeenCalledWith(
				"id",
				"initial-id",
			);
		});

		component.htmlAttributes = {
			id: "updated-id",
			class: "new-class",
		};
		vi.clearAllMocks();
		mockRenderProcaptcha.mockResolvedValue(undefined);

		component.ngOnChanges();

		await vi.waitFor(() => {
			expect(mockNativeElement.setAttribute).toHaveBeenCalledWith(
				"id",
				"updated-id",
			);
			expect(mockNativeElement.setAttribute).toHaveBeenCalledWith(
				"class",
				"new-class",
			);
		});
	});

	it("should clear old HTML attributes when htmlAttributes changes", async () => {
		// Testing that old attributes are removed when htmlAttributes changes
		const settings: ProcaptchaRenderOptions = {
			siteKey: "test-site-key",
		};
		component.settings = settings;

		// Set initial attributes and simulate existing DOM attributes
		component.htmlAttributes = {
			id: "initial-id",
			"data-old": "old-value",
		};
		// Mock existing attributes on the element
		mockNativeElement.attributes = [{ name: "id" }, { name: "data-old" }];
		mockRenderProcaptcha.mockResolvedValue(undefined);
		component.ngOnInit();

		// Change to different attributes
		component.htmlAttributes = {
			class: "new-class",
			"data-new": "new-value",
		};
		// Update mock to reflect current attributes before clearing
		mockNativeElement.attributes = [{ name: "id" }, { name: "data-old" }];
		vi.clearAllMocks();
		mockRenderProcaptcha.mockResolvedValue(undefined);

		component.ngOnChanges();

		await vi.waitFor(() => {
			// Verify old attributes are removed
			expect(mockNativeElement.removeAttribute).toHaveBeenCalledWith("id");
			expect(mockNativeElement.removeAttribute).toHaveBeenCalledWith(
				"data-old",
			);
			// Verify new attributes are set
			expect(mockNativeElement.setAttribute).toHaveBeenCalledWith(
				"class",
				"new-class",
			);
			expect(mockNativeElement.setAttribute).toHaveBeenCalledWith(
				"data-new",
				"new-value",
			);
		});
	});
});

describe("type safety", () => {
	let typeComponent: ProcaptchaComponent;

	beforeEach(() => {
		// Create a simple component instance for type testing
		typeComponent = new ProcaptchaComponent();
	});

	it("should accept ProcaptchaRenderOptions type for settings", () => {
		// Testing that the settings property accepts the correct ProcaptchaRenderOptions type
		const settings: ProcaptchaRenderOptions = {
			siteKey: "test-site-key",
		};
		typeComponent.settings = settings;
		expect(typeComponent.settings).toBe(settings);
	});

	it("should accept object type for htmlAttributes", () => {
		// Testing that htmlAttributes accepts the correct object type with string values
		const htmlAttributes: { [key: string]: string } = {
			id: "test",
		};
		typeComponent.htmlAttributes = htmlAttributes;
		expect(typeComponent.htmlAttributes).toBe(htmlAttributes);
	});

	it("should accept all valid ProcaptchaRenderOptions properties", () => {
		// Testing comprehensive type safety for all ProcaptchaRenderOptions properties
		const settings: ProcaptchaRenderOptions = {
			siteKey: "test-site-key",
			theme: "dark",
			captchaType: "frictionless",
			callback: vi.fn(),
			"challenge-valid-length": "300",
			"chalexpired-callback": vi.fn(),
			"expired-callback": vi.fn(),
			"open-callback": vi.fn(),
			"close-callback": vi.fn(),
			"error-callback": vi.fn(),
			"failed-callback": vi.fn(),
			"reset-callback": vi.fn(),
			language: "en",
			size: "invisible",
			web3: true,
			userAccountAddress: "0x123...",
		};
		typeComponent.settings = settings;
		expect(typeComponent.settings).toBe(settings);
	});

	it("should accept string callbacks in ProcaptchaRenderOptions", () => {
		// Testing that callback properties can be strings (for global function references)
		const settings: ProcaptchaRenderOptions = {
			siteKey: "test-site-key",
			callback: "window.myCallback",
			"error-callback": "window.handleError",
		};
		typeComponent.settings = settings;
		expect(typeComponent.settings.callback).toBe("window.myCallback");
	});

	it("should accept numeric strings for challenge-valid-length", () => {
		// Testing that challenge-valid-length accepts string values representing numbers
		const settings: ProcaptchaRenderOptions = {
			siteKey: "test-site-key",
			"challenge-valid-length": "600",
		};
		typeComponent.settings = settings;
		expect(typeComponent.settings["challenge-valid-length"]).toBe("600");
	});
});
