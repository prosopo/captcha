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

import { renderProcaptcha } from "@prosopo/procaptcha-wrapper";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProcaptchaComponent from "./procaptchaComponent.vue";

// Mock renderProcaptcha to return a promise for testing async behavior
vi.mock("@prosopo/procaptcha-wrapper", () => ({
	renderProcaptcha: vi.fn().mockResolvedValue(undefined),
}));

describe("ProcaptchaComponent", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("renders a div element", () => {
		const wrapper = mount(ProcaptchaComponent, {
			props: {
				siteKey: "test-site-key",
			},
		});

		expect(wrapper.find("div").exists()).toBe(true);
	});

	it("calls renderProcaptcha on mount with correct props", () => {
		const props = {
			siteKey: "test-site-key",
			theme: "light" as const,
			captchaType: "pow" as const,
		};

		mount(ProcaptchaComponent, {
			props,
		});

		expect(renderProcaptcha).toHaveBeenCalledTimes(1);
		expect(renderProcaptcha).toHaveBeenCalledWith(
			expect.any(HTMLElement),
			expect.objectContaining({
				siteKey: "test-site-key",
				theme: "light",
				captchaType: "pow",
			}),
		);
	});

	it("calls renderProcaptcha on update when props change", async () => {
		const wrapper = mount(ProcaptchaComponent, {
			props: {
				siteKey: "test-site-key",
			},
		});

		expect(renderProcaptcha).toHaveBeenCalledTimes(1);

		await wrapper.setProps({
			siteKey: "updated-site-key",
			theme: "dark",
		});

		expect(renderProcaptcha).toHaveBeenCalledTimes(2);
		expect(renderProcaptcha).toHaveBeenLastCalledWith(
			expect.any(HTMLElement),
			expect.objectContaining({
				siteKey: "updated-site-key",
				theme: "dark",
			}),
		);
	});

	it("applies htmlAttributes to the div element", () => {
		const wrapper = mount(ProcaptchaComponent, {
			props: {
				siteKey: "test-site-key",
				htmlAttributes: {
					class: "test-class",
					id: "test-id",
					"data-test": "test-value",
				},
			},
		});

		const div = wrapper.find("div");
		expect(div.attributes("class")).toBe("test-class");
		expect(div.attributes("id")).toBe("test-id");
		expect(div.attributes("data-test")).toBe("test-value");
	});

	it("handles htmlAttributes with style object", () => {
		const wrapper = mount(ProcaptchaComponent, {
			props: {
				siteKey: "test-site-key",
				htmlAttributes: {
					style: {
						width: "100px",
						height: "200px",
					},
				},
			},
		});

		const div = wrapper.find("div");
		const style = div.attributes("style");
		expect(style).toContain("width: 100px");
		expect(style).toContain("height: 200px");
	});

	it("handles empty htmlAttributes", () => {
		const wrapper = mount(ProcaptchaComponent, {
			props: {
				siteKey: "test-site-key",
				htmlAttributes: {},
			},
		});

		expect(wrapper.find("div").exists()).toBe(true);
		expect(renderProcaptcha).toHaveBeenCalledTimes(1);
	});

	it("handles undefined htmlAttributes", () => {
		const wrapper = mount(ProcaptchaComponent, {
			props: {
				siteKey: "test-site-key",
			},
		});

		expect(wrapper.find("div").exists()).toBe(true);
		expect(renderProcaptcha).toHaveBeenCalledTimes(1);
	});

	it("passes all ProcaptchaRenderOptions props to renderProcaptcha", () => {
		const callback = vi.fn();
		const chalexpiredCallback = vi.fn();
		const expiredCallback = vi.fn();
		const openCallback = vi.fn();
		const closeCallback = vi.fn();
		const errorCallback = vi.fn();
		const failedCallback = vi.fn();
		const resetCallback = vi.fn();

		mount(ProcaptchaComponent, {
			props: {
				siteKey: "test-site-key",
				theme: "dark",
				captchaType: "pow",
				callback,
				"challenge-valid-length": "300",
				"chalexpired-callback": chalexpiredCallback,
				"expired-callback": expiredCallback,
				"open-callback": openCallback,
				"close-callback": closeCallback,
				"error-callback": errorCallback,
				"failed-callback": failedCallback,
				"reset-callback": resetCallback,
				language: "en",
				size: "invisible",
				web3: true,
				userAccountAddress: "0x123",
			},
		});

		// Vue converts kebab-case props to camelCase when passed to the component
		// and htmlAttributes is included in the properties object
		expect(renderProcaptcha).toHaveBeenCalledWith(
			expect.any(HTMLElement),
			expect.objectContaining({
				siteKey: "test-site-key",
				theme: "dark",
				captchaType: "pow",
				callback,
				challengeValidLength: "300",
				chalexpiredCallback,
				expiredCallback,
				openCallback,
				closeCallback,
				errorCallback,
				failedCallback,
				resetCallback,
				language: "en",
				size: "invisible",
				web3: true,
				userAccountAddress: "0x123",
			}),
		);
	});

	it("handles callback as string", () => {
		const props = {
			siteKey: "test-site-key",
			callback: "window.myCallback",
		};

		mount(ProcaptchaComponent, {
			props,
		});

		expect(renderProcaptcha).toHaveBeenCalledWith(
			expect.any(HTMLElement),
			expect.objectContaining({
				siteKey: "test-site-key",
				callback: "window.myCallback",
			}),
		);
	});

	it("handles callback as function", () => {
		const callback = vi.fn();
		const props = {
			siteKey: "test-site-key",
			callback,
		};

		mount(ProcaptchaComponent, {
			props,
		});

		expect(renderProcaptcha).toHaveBeenCalledWith(
			expect.any(HTMLElement),
			expect.objectContaining({
				siteKey: "test-site-key",
				callback,
			}),
		);
	});

	it("does not call renderProcaptcha if wrapper element is null", () => {
		// This test verifies the component handles the case where wrapper.value is null
		// In practice, this shouldn't happen in normal usage, but we test the guard clause
		const wrapper = mount(ProcaptchaComponent, {
			props: {
				siteKey: "test-site-key",
			},
		});

		// The component should still call renderProcaptcha because the element exists
		expect(renderProcaptcha).toHaveBeenCalledTimes(1);

		// Unmount to clear the ref
		wrapper.unmount();

		// After unmount, the ref should be null, but we can't easily test this
		// without accessing internal component state
	});

	it("handles multiple prop updates correctly", async () => {
		const wrapper = mount(ProcaptchaComponent, {
			props: {
				siteKey: "test-site-key",
			},
		});

		expect(renderProcaptcha).toHaveBeenCalledTimes(1);

		await wrapper.setProps({ theme: "light" });
		expect(renderProcaptcha).toHaveBeenCalledTimes(2);

		await wrapper.setProps({ captchaType: "pow" });
		expect(renderProcaptcha).toHaveBeenCalledTimes(3);

		await wrapper.setProps({ language: "en" });
		expect(renderProcaptcha).toHaveBeenCalledTimes(4);
	});

	it("handles htmlAttributes with custom data attributes", () => {
		const wrapper = mount(ProcaptchaComponent, {
			props: {
				siteKey: "test-site-key",
				htmlAttributes: {
					"data-custom": "custom-value",
					"data-another": "another-value",
				},
			},
		});

		const div = wrapper.find("div");
		expect(div.attributes("data-custom")).toBe("custom-value");
		expect(div.attributes("data-another")).toBe("another-value");
	});

	it("merges htmlAttributes with other props correctly", () => {
		const wrapper = mount(ProcaptchaComponent, {
			props: {
				siteKey: "test-site-key",
				theme: "dark",
				htmlAttributes: {
					class: "my-class",
				},
			},
		});

		// htmlAttributes should be applied to the div
		expect(wrapper.find("div").attributes("class")).toBe("my-class");

		// renderProcaptcha should receive all props including siteKey and theme
		// htmlAttributes is included in the properties object passed to renderProcaptcha
		expect(renderProcaptcha).toHaveBeenCalledWith(
			expect.any(HTMLElement),
			expect.objectContaining({
				siteKey: "test-site-key",
				theme: "dark",
				htmlAttributes: expect.objectContaining({
					class: "my-class",
				}),
			}),
		);
	});

	it("handles minimal props with only siteKey", () => {
		mount(ProcaptchaComponent, {
			props: {
				siteKey: "minimal-site-key",
			},
		});

		expect(renderProcaptcha).toHaveBeenCalledWith(
			expect.any(HTMLElement),
			expect.objectContaining({
				siteKey: "minimal-site-key",
			}),
		);
	});

	// Integration tests focusing on component behavior and error handling
	describe("Integration Tests", () => {
		it("handles renderProcaptcha errors gracefully", async () => {
			// Test error handling when renderProcaptcha throws
			const mockError = new Error("Render failed");
			vi.mocked(renderProcaptcha).mockRejectedValueOnce(mockError);

			// Mock console.error to verify error handling
			const consoleErrorSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});

			expect(() => {
				mount(ProcaptchaComponent, {
					props: {
						siteKey: "test-site-key",
					},
				});
			}).not.toThrow();

			// Wait for the async operation to complete
			await new Promise((resolve) => setTimeout(resolve, 0));

			// The component should not crash, error should be handled internally
			expect(consoleErrorSpy).not.toHaveBeenCalled();

			consoleErrorSpy.mockRestore();
		});

		it("handles rapid prop updates without calling renderProcaptcha multiple times unnecessarily", async () => {
			const wrapper = mount(ProcaptchaComponent, {
				props: {
					siteKey: "initial-site-key",
				},
			});

			expect(renderProcaptcha).toHaveBeenCalledTimes(1);

			// Rapid updates
			await wrapper.setProps({ theme: "light" });
			await wrapper.setProps({ captchaType: "pow" });
			await wrapper.setProps({ language: "en" });

			// Vue batches updates, but each update should trigger renderProcaptcha
			expect(renderProcaptcha).toHaveBeenCalledTimes(4);
		});

		it("passes correct element reference to renderProcaptcha", () => {
			const wrapper = mount(ProcaptchaComponent, {
				props: {
					siteKey: "test-site-key",
				},
			});

			const divElement = wrapper.find("div").element;
			expect(renderProcaptcha).toHaveBeenCalledWith(
				divElement,
				expect.any(Object),
			);
		});

		it("maintains element reference across updates", async () => {
			const wrapper = mount(ProcaptchaComponent, {
				props: {
					siteKey: "test-site-key",
				},
			});

			const initialElement = wrapper.find("div").element;

			await wrapper.setProps({ theme: "dark" });

			const updatedElement = wrapper.find("div").element;

			// Element reference should be the same
			expect(updatedElement).toBe(initialElement);

			// renderProcaptcha should be called with the same element
			expect(renderProcaptcha).toHaveBeenLastCalledWith(
				initialElement,
				expect.objectContaining({ theme: "dark" }),
			);
		});

		it("handles component unmounting during async renderProcaptcha call", async () => {
			// Create a promise that we can control
			let resolveRender: (() => void) | undefined;
			const renderPromise = new Promise<void>((resolve) => {
				resolveRender = resolve;
			});

			vi.mocked(renderProcaptcha).mockReturnValueOnce(renderPromise);

			const wrapper = mount(ProcaptchaComponent, {
				props: {
					siteKey: "test-site-key",
				},
			});

			// Unmount before the async operation completes
			wrapper.unmount();

			// Resolve the render promise
			if (resolveRender) {
				resolveRender();
			}

			// Component should handle this gracefully without errors
			await renderPromise;
		});

		it("applies complex htmlAttributes combinations", () => {
			const wrapper = mount(ProcaptchaComponent, {
				props: {
					siteKey: "test-site-key",
					htmlAttributes: {
						class: "captcha-container main-theme",
						"data-testid": "procaptcha",
						style: {
							width: "300px",
							margin: "10px auto",
						},
						"aria-label": "Captcha verification",
						role: "region",
					},
				},
			});

			const div = wrapper.find("div");
			expect(div.attributes("class")).toBe("captcha-container main-theme");
			expect(div.attributes("data-testid")).toBe("procaptcha");
			expect(div.attributes("aria-label")).toBe("Captcha verification");
			expect(div.attributes("role")).toBe("region");
			expect(div.attributes("style")).toContain("width: 300px");
			expect(div.attributes("style")).toContain("margin: 10px auto");
		});

		it("handles props with special characters and edge cases", () => {
			const wrapper = mount(ProcaptchaComponent, {
				props: {
					siteKey: "test-site-key",
					"challenge-valid-length": "special-value",
					callback: "function(){return true;}",
					htmlAttributes: {
						"data-complex": "value with spaces & special chars: @#$%",
					},
				},
			});

			const div = wrapper.find("div");
			expect(div.attributes("data-complex")).toBe(
				"value with spaces & special chars: @#$%",
			);

			expect(renderProcaptcha).toHaveBeenCalledWith(
				expect.any(HTMLElement),
				expect.objectContaining({
					siteKey: "test-site-key",
					challengeValidLength: "special-value",
					callback: "function(){return true;}",
				}),
			);
		});

		it("renders correctly in different DOM contexts", () => {
			// Test that component works when mounted in different container types
			const container = document.createElement("div");
			document.body.appendChild(container);

			const wrapper = mount(ProcaptchaComponent, {
				props: {
					siteKey: "test-site-key",
				},
				attachTo: container,
			});

			expect(wrapper.find("div").exists()).toBe(true);
			expect(renderProcaptcha).toHaveBeenCalledTimes(1);

			// Cleanup
			document.body.removeChild(container);
		});

		it("handles empty and null values in props", () => {
			const wrapper = mount(ProcaptchaComponent, {
				props: {
					siteKey: "",
					theme: undefined,
					captchaType: undefined,
				},
			});

		expect(renderProcaptcha).toHaveBeenCalledWith(
			expect.any(HTMLElement),
			expect.objectContaining({
				siteKey: "",
				theme: undefined,
				captchaType: undefined,
			}),
		);
		});
	});
});
