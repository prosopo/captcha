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

import { ApiParams } from "@prosopo/types";
import type { ProcaptchaRenderOptions, ProcaptchaToken } from "@prosopo/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	getDefaultCallbacks,
	setUserCallbacks,
} from "../callbacks/defaultCallbacks.js";

describe("callbacks/defaultCallbacks", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
		vi.clearAllMocks();
	});

	describe("getDefaultCallbacks", () => {
		it("should return default callbacks object", () => {
			const callbacks = getDefaultCallbacks();

			expect(callbacks).toHaveProperty("onHuman");
			expect(callbacks).toHaveProperty("onChallengeExpired");
			expect(callbacks).toHaveProperty("onExtensionNotFound");
			expect(callbacks).toHaveProperty("onExpired");
			expect(callbacks).toHaveProperty("onError");
			expect(callbacks).toHaveProperty("onClose");
			expect(callbacks).toHaveProperty("onOpen");
			expect(callbacks).toHaveProperty("onFailed");
			expect(callbacks).toHaveProperty("onReset");
			expect(callbacks).toHaveProperty("onReload");

			expect(typeof callbacks.onHuman).toBe("function");
			expect(typeof callbacks.onChallengeExpired).toBe("function");
			expect(typeof callbacks.onError).toBe("function");
		});

		it("onHuman should add hidden input to form with token", () => {
			const form = document.createElement("form");
			const widget = document.createElement("div");
			form.appendChild(widget);
			document.body.appendChild(form);

			const callbacks = getDefaultCallbacks(widget);
			const token = "test-token-123" as ProcaptchaToken;

			callbacks.onHuman(token);

			const inputs = form.querySelectorAll(
				`input[name="${ApiParams.procaptchaResponse}"]`,
			);
			expect(inputs.length).toBe(1);
			expect((inputs[0] as HTMLInputElement).value).toBe(token);
			expect((inputs[0] as HTMLInputElement).type).toBe("hidden");
		});

		it("onHuman should handle missing parent form gracefully", () => {
			const widget = document.createElement("div");
			document.body.appendChild(widget);

			const consoleErrorSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});

			const callbacks = getDefaultCallbacks(widget);
			const token = "test-token-123" as ProcaptchaToken;

			callbacks.onHuman(token);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				"Parent form not found for the element:",
				widget,
			);

			consoleErrorSpy.mockRestore();
		});

		it("onChallengeExpired should remove procaptcha response", () => {
			const input = document.createElement("input");
			input.name = ApiParams.procaptchaResponse;
			document.body.appendChild(input);

			const callbacks = getDefaultCallbacks();
			callbacks.onChallengeExpired();

			expect(
				document.getElementsByName(ApiParams.procaptchaResponse).length,
			).toBe(0);
		});

		it("onExpired should remove procaptcha response", () => {
			const input = document.createElement("input");
			input.name = ApiParams.procaptchaResponse;
			document.body.appendChild(input);

			const callbacks = getDefaultCallbacks();
			callbacks.onExpired();

			expect(
				document.getElementsByName(ApiParams.procaptchaResponse).length,
			).toBe(0);
		});

		it("onError should remove procaptcha response and log error", () => {
			const input = document.createElement("input");
			input.name = ApiParams.procaptchaResponse;
			document.body.appendChild(input);

			const consoleErrorSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});
			const callbacks = getDefaultCallbacks();
			const error = new Error("Test error");

			callbacks.onError(error);

			expect(
				document.getElementsByName(ApiParams.procaptchaResponse).length,
			).toBe(0);
			expect(consoleErrorSpy).toHaveBeenCalledWith(error);

			consoleErrorSpy.mockRestore();
		});

		it("onFailed should show alert", () => {
			const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
			const callbacks = getDefaultCallbacks();

			callbacks.onFailed();

			expect(alertSpy).toHaveBeenCalledWith(
				"Captcha challenge failed. Please try again",
			);

			alertSpy.mockRestore();
		});

		it("onReset should remove procaptcha response", () => {
			const input = document.createElement("input");
			input.name = ApiParams.procaptchaResponse;
			document.body.appendChild(input);

			const callbacks = getDefaultCallbacks();
			callbacks.onReset();

			expect(
				document.getElementsByName(ApiParams.procaptchaResponse).length,
			).toBe(0);
		});
	});

	describe("setUserCallbacks", () => {
		it("should wrap user callback for onHuman", () => {
			const form = document.createElement("form");
			const widget = document.createElement("div");
			form.appendChild(widget);
			document.body.appendChild(form);

			const userCallback = vi.fn();
			const renderOptions: ProcaptchaRenderOptions = {
				callback: userCallback,
			};

			const callbacks = getDefaultCallbacks(widget);
			setUserCallbacks(renderOptions, callbacks, widget);

			const token = "test-token" as ProcaptchaToken;
			callbacks.onHuman(token);

			expect(userCallback).toHaveBeenCalledWith(token);
			// Also verify that default behavior (adding to form) still happens
			const inputs = form.querySelectorAll(
				`input[name="${ApiParams.procaptchaResponse}"]`,
			);
			expect(inputs.length).toBeGreaterThan(0);
		});

		it("should use data attribute callback over renderOptions", () => {
			const form = document.createElement("form");
			const widget = document.createElement("div");
			form.appendChild(widget);
			document.body.appendChild(form);

			const dataCallback = vi.fn();
			const renderCallback = vi.fn();

			// biome-ignore lint/suspicious/noExplicitAny: Test setup
			(window as any).dataCallbackFn = dataCallback;
			widget.setAttribute("data-callback", "dataCallbackFn");

			const renderOptions: ProcaptchaRenderOptions = {
				callback: renderCallback,
			};

			const callbacks = getDefaultCallbacks(widget);
			setUserCallbacks(renderOptions, callbacks, widget);

			const token = "test-token" as ProcaptchaToken;
			callbacks.onHuman(token);

			expect(dataCallback).toHaveBeenCalledWith(token);
			expect(renderCallback).not.toHaveBeenCalled();

			// biome-ignore lint/suspicious/noExplicitAny: Test cleanup
			(window as any).dataCallbackFn = undefined;
		});

		it("should handle string callback name in renderOptions", () => {
			const form = document.createElement("form");
			const widget = document.createElement("div");
			form.appendChild(widget);
			document.body.appendChild(form);

			const namedCallback = vi.fn();
			// biome-ignore lint/suspicious/noExplicitAny: Test setup
			(window as any).myCallback = namedCallback;

			const renderOptions: ProcaptchaRenderOptions = {
				// biome-ignore lint/suspicious/noExplicitAny: Test string callback
				callback: "myCallback" as any,
			};

			const callbacks = getDefaultCallbacks(widget);
			setUserCallbacks(renderOptions, callbacks, widget);

			const token = "test-token" as ProcaptchaToken;
			callbacks.onHuman(token);

			expect(namedCallback).toHaveBeenCalledWith(token);

			// biome-ignore lint/suspicious/noExplicitAny: Test cleanup
			(window as any).myCallback = undefined;
		});

		it("should set expired callback from renderOptions", () => {
			const widget = document.createElement("div");
			const expiredCallback = vi.fn();

			const renderOptions: ProcaptchaRenderOptions = {
				"expired-callback": expiredCallback,
			};

			const callbacks = getDefaultCallbacks(widget);
			setUserCallbacks(renderOptions, callbacks, widget);

			callbacks.onExpired();

			expect(expiredCallback).toHaveBeenCalled();
		});

		it("should set error callback from renderOptions", () => {
			const widget = document.createElement("div");
			const errorCallback = vi.fn();

			const renderOptions: ProcaptchaRenderOptions = {
				"error-callback": errorCallback,
			};

			const callbacks = getDefaultCallbacks(widget);
			setUserCallbacks(renderOptions, callbacks, widget);

			const error = new Error("Test error");
			callbacks.onError(error);

			expect(errorCallback).toHaveBeenCalledWith(error);
		});

		it("should set failed callback from renderOptions", () => {
			const widget = document.createElement("div");
			const failedCallback = vi.fn();

			const renderOptions: ProcaptchaRenderOptions = {
				"failed-callback": failedCallback,
			};

			const callbacks = getDefaultCallbacks(widget);
			setUserCallbacks(renderOptions, callbacks, widget);

			callbacks.onFailed();

			expect(failedCallback).toHaveBeenCalled();
		});

		it("should set reset callback from renderOptions", () => {
			const widget = document.createElement("div");
			const resetCallback = vi.fn();

			const renderOptions: ProcaptchaRenderOptions = {
				"reset-callback": resetCallback,
			};

			const callbacks = getDefaultCallbacks(widget);
			setUserCallbacks(renderOptions, callbacks, widget);

			callbacks.onReset();

			expect(resetCallback).toHaveBeenCalled();
		});

		it("should handle undefined renderOptions gracefully", () => {
			const widget = document.createElement("div");
			const callbacks = getDefaultCallbacks(widget);

			expect(() =>
				setUserCallbacks(undefined, callbacks, widget),
			).not.toThrow();
		});

		it("should set open and close callbacks", () => {
			const widget = document.createElement("div");
			const openCallback = vi.fn();
			const closeCallback = vi.fn();

			const renderOptions: ProcaptchaRenderOptions = {
				"open-callback": openCallback,
				"close-callback": closeCallback,
			};

			const callbacks = getDefaultCallbacks(widget);
			setUserCallbacks(renderOptions, callbacks, widget);

			callbacks.onOpen();
			callbacks.onClose();

			expect(openCallback).toHaveBeenCalled();
			expect(closeCallback).toHaveBeenCalled();
		});
	});
});
