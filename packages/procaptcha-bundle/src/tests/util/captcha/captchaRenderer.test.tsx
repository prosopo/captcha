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

import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CaptchaRenderer } from "../../../util/captcha/captchaRenderer.js";
import { CaptchaComponentProvider } from "../../../util/captcha/captchaComponentProvider.js";
import { CaptchaType } from "@prosopo/types";
import type { Callbacks, ProcaptchaRenderOptions } from "@prosopo/types";
import type { Ti18n } from "@prosopo/locale";

vi.mock("react-dom/client", () => ({
	createRoot: vi.fn(() => ({
		render: vi.fn(),
		unmount: vi.fn(),
	})),
}));

vi.mock("@emotion/cache", () => ({
	default: vi.fn(() => ({})),
}));

vi.mock("../../../util/configCreator.js", () => ({
	createConfig: vi.fn(() => ({
		account: { address: "test" },
		captchas: {
			image: { solutionTimeout: 300 },
			pow: { solutionTimeout: 300 },
		},
	})),
}));

vi.mock("../../../util/language.js", () => ({
	setLanguage: vi.fn(),
}));

vi.mock("../../../util/timeout.js", () => ({
	setValidChallengeLength: vi.fn(),
}));

describe("CaptchaRenderer", () => {
	let dom: JSDOM;
	let container: HTMLElement;
	let widgetContainer: HTMLElement;
	let renderer: CaptchaRenderer;
	let mockComponentProvider: CaptchaComponentProvider;
	let mockRenderOptions: ProcaptchaRenderOptions;
	let mockCallbacks: Callbacks;
	let mockI18n: Ti18n;

	beforeEach(() => {
		dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
		global.document = dom.window.document;
		container = document.createElement("div");
		widgetContainer = document.createElement("div");
		mockComponentProvider = {
			getCaptchaComponent: vi.fn(() => <div>MockCaptcha</div>),
		} as unknown as CaptchaComponentProvider;
		renderer = new CaptchaRenderer(mockComponentProvider);
		mockRenderOptions = {
			siteKey: "test-site-key",
			theme: "light",
		};
		mockCallbacks = {};
		mockI18n = {} as Ti18n;
	});

	afterEach(() => {
		vi.clearAllMocks();
		// biome-ignore lint/suspicious/noExplicitAny: TODO fix any
		(global as any).document = undefined;
	});

	it("should create React root and render captcha component", async () => {
		const { createRoot } = await import("react-dom/client");

		const root = renderer.renderCaptcha(
			{
				identifierPrefix: "test-",
				emotionCacheKey: "test-cache",
				webComponentTag: "test-tag",
				defaultCaptchaType: CaptchaType.frictionless,
			},
			container,
			mockRenderOptions,
			mockCallbacks,
			true,
			mockI18n,
			false,
			widgetContainer,
		);

		expect(createRoot).toHaveBeenCalledWith(container, {
			identifierPrefix: "test-",
		});
		expect(root).toBeDefined();
	});

	it("should use captchaType from renderOptions when provided", async () => {
		renderer.renderCaptcha(
			{
				identifierPrefix: "test-",
				emotionCacheKey: "test-cache",
				webComponentTag: "test-tag",
				defaultCaptchaType: CaptchaType.frictionless,
			},
			container,
			{ ...mockRenderOptions, captchaType: CaptchaType.pow },
			mockCallbacks,
			true,
			mockI18n,
			false,
			widgetContainer,
		);

		expect(mockComponentProvider.getCaptchaComponent).toHaveBeenCalledWith(
			CaptchaType.pow,
			expect.any(Object),
		);
	});

	it("should use defaultCaptchaType when captchaType is not in renderOptions", async () => {
		renderer.renderCaptcha(
			{
				identifierPrefix: "test-",
				emotionCacheKey: "test-cache",
				webComponentTag: "test-tag",
				defaultCaptchaType: CaptchaType.image,
			},
			container,
			mockRenderOptions,
			mockCallbacks,
			true,
			mockI18n,
			false,
			widgetContainer,
		);

		expect(mockComponentProvider.getCaptchaComponent).toHaveBeenCalledWith(
			CaptchaType.image,
			expect.any(Object),
		);
	});

	it("should call setValidChallengeLength and setLanguage", async () => {
		const { setValidChallengeLength } = await import(
			"../../../util/timeout.js"
		);
		const { setLanguage } = await import("../../../util/language.js");

		renderer.renderCaptcha(
			{
				identifierPrefix: "test-",
				emotionCacheKey: "test-cache",
				webComponentTag: "test-tag",
				defaultCaptchaType: CaptchaType.frictionless,
			},
			container,
			mockRenderOptions,
			mockCallbacks,
			true,
			mockI18n,
			false,
			widgetContainer,
		);

		expect(setValidChallengeLength).toHaveBeenCalledWith(
			mockRenderOptions,
			container,
			expect.any(Object),
		);
		expect(setLanguage).toHaveBeenCalledWith(
			mockRenderOptions,
			container,
			expect.any(Object),
		);
	});

	it("should pass correct props to captcha component", async () => {
		renderer.renderCaptcha(
			{
				identifierPrefix: "test-",
				emotionCacheKey: "test-cache",
				webComponentTag: "test-tag",
				defaultCaptchaType: CaptchaType.frictionless,
			},
			container,
			mockRenderOptions,
			mockCallbacks,
			true,
			mockI18n,
			false,
			widgetContainer,
		);

		expect(mockComponentProvider.getCaptchaComponent).toHaveBeenCalledWith(
			CaptchaType.frictionless,
			expect.objectContaining({
				config: expect.any(Object),
				i18n: mockI18n,
				callbacks: mockCallbacks,
				container: widgetContainer,
			}),
		);
	});

	it("should create emotion cache with correct key and container", async () => {
		const createCache = await import("@emotion/cache");

		renderer.renderCaptcha(
			{
				identifierPrefix: "test-",
				emotionCacheKey: "test-cache-key",
				webComponentTag: "test-tag",
				defaultCaptchaType: CaptchaType.frictionless,
			},
			container,
			mockRenderOptions,
			mockCallbacks,
			true,
			mockI18n,
			false,
			widgetContainer,
		);

		expect(createCache.default).toHaveBeenCalledWith({
			key: "test-cache-key",
			prepend: true,
			container: container,
		});
	});

	it("should handle invisible mode", async () => {
		renderer.renderCaptcha(
			{
				identifierPrefix: "test-",
				emotionCacheKey: "test-cache",
				webComponentTag: "test-tag",
				defaultCaptchaType: CaptchaType.frictionless,
			},
			container,
			mockRenderOptions,
			mockCallbacks,
			true,
			mockI18n,
			true,
			widgetContainer,
		);

		expect(mockComponentProvider.getCaptchaComponent).toHaveBeenCalled();
	});

	it("should handle web2 mode", async () => {
		renderer.renderCaptcha(
			{
				identifierPrefix: "test-",
				emotionCacheKey: "test-cache",
				webComponentTag: "test-tag",
				defaultCaptchaType: CaptchaType.frictionless,
			},
			container,
			mockRenderOptions,
			mockCallbacks,
			true,
			mockI18n,
			false,
			widgetContainer,
		);

		expect(mockComponentProvider.getCaptchaComponent).toHaveBeenCalled();
	});

	it("should handle web3 mode", async () => {
		renderer.renderCaptcha(
			{
				identifierPrefix: "test-",
				emotionCacheKey: "test-cache",
				webComponentTag: "test-tag",
				defaultCaptchaType: CaptchaType.frictionless,
			},
			container,
			mockRenderOptions,
			mockCallbacks,
			false,
			mockI18n,
			false,
			widgetContainer,
		);

		expect(mockComponentProvider.getCaptchaComponent).toHaveBeenCalled();
	});
});

