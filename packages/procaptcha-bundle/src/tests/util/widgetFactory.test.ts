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
import { WidgetFactory } from "../../util/widgetFactory.js";
import { WidgetThemeResolver } from "../../util/widgetThemeResolver.js";
import type { ProcaptchaRenderOptions } from "@prosopo/types";

vi.mock("@prosopo/widget-skeleton", () => ({
	createWidgetSkeleton: vi.fn(() => ({
		widgetInteractiveArea: document.createElement("div"),
		webComponent: document.createElement("div"),
	})),
	lightTheme: {},
	darkTheme: {},
}));

vi.mock("@prosopo/locale", async () => {
	const actual = await vi.importActual("@prosopo/locale");
	return {
		...actual,
		loadI18next: vi.fn(() => Promise.resolve({})),
	};
});

vi.mock("../../util/captcha/captchaRenderer.js", () => ({
	CaptchaRenderer: vi.fn().mockImplementation(() => ({
		renderCaptcha: vi.fn(() => ({
			render: vi.fn(),
			unmount: vi.fn(),
		})),
	})),
}));

vi.mock("../../util/captcha/captchaComponentProvider.js", () => ({
	CaptchaComponentProvider: vi.fn().mockImplementation(() => ({
		getCaptchaComponent: vi.fn(),
	})),
}));

vi.mock("@prosopo/procaptcha-common", () => ({
	getDefaultCallbacks: vi.fn(() => ({})),
	setUserCallbacks: vi.fn(),
}));

describe("WidgetFactory", () => {
	let dom: JSDOM;
	let factory: WidgetFactory;
	let themeResolver: WidgetThemeResolver;

	beforeEach(() => {
		dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
		global.document = dom.window.document;
		themeResolver = new WidgetThemeResolver();
		factory = new WidgetFactory(themeResolver);
	});

	afterEach(() => {
		vi.clearAllMocks();
		// biome-ignore lint/suspicious/noExplicitAny: TODO fix any
		(global as any).document = undefined;
	});

	describe("createWidgets", () => {
		it("should create widgets for multiple containers", async () => {
			const containers = [
				document.createElement("div"),
				document.createElement("div"),
			];
			const renderOptions: ProcaptchaRenderOptions = {
				siteKey: "test-key",
			};

			const roots = await factory.createWidgets(containers, renderOptions);

			expect(roots).toHaveLength(2);
		});

		it("should create widget with default parameters", async () => {
			const container = document.createElement("div");
			const renderOptions: ProcaptchaRenderOptions = {
				siteKey: "test-key",
			};

			const roots = await factory.createWidgets([container], renderOptions);

			expect(roots).toHaveLength(1);
		});

		it("should handle web2 mode", async () => {
			const container = document.createElement("div");
			const renderOptions: ProcaptchaRenderOptions = {
				siteKey: "test-key",
			};

			const roots = await factory.createWidgets(
				[container],
				renderOptions,
				true,
			);

			expect(roots).toHaveLength(1);
		});

		it("should handle web3 mode", async () => {
			const container = document.createElement("div");
			const renderOptions: ProcaptchaRenderOptions = {
				siteKey: "test-key",
			};

			const roots = await factory.createWidgets(
				[container],
				renderOptions,
				false,
			);

			expect(roots).toHaveLength(1);
		});

		it("should handle invisible mode", async () => {
			const container = document.createElement("div");
			const renderOptions: ProcaptchaRenderOptions = {
				siteKey: "test-key",
			};

			const roots = await factory.createWidgets(
				[container],
				renderOptions,
				true,
				true,
			);

			expect(roots).toHaveLength(1);
		});
	});

	describe("createWidget", () => {
		it("should create widget with visible mode", async () => {
			const container = document.createElement("div");
			const renderOptions: ProcaptchaRenderOptions = {
				siteKey: "test-key",
				theme: "light",
			};

			const root = await factory.createWidget(
				container,
				renderOptions,
				{},
				true,
				false,
			);

			expect(root).toBeDefined();
		});

		it("should create widget with invisible mode", async () => {
			const container = document.createElement("div");
			const renderOptions: ProcaptchaRenderOptions = {
				siteKey: "test-key",
			};

			const root = await factory.createWidget(
				container,
				renderOptions,
				{},
				true,
				true,
			);

			expect(root).toBeDefined();
		});

		it("should use theme resolver for theme", async () => {
			const container = document.createElement("div");
			const renderOptions: ProcaptchaRenderOptions = {
				siteKey: "test-key",
				theme: "dark",
			};

			const root = await factory.createWidget(
				container,
				renderOptions,
				{},
				true,
				false,
			);

			expect(root).toBeDefined();
		});

		it("should create widget skeleton for visible mode", async () => {
			const { createWidgetSkeleton } = await import(
				"@prosopo/widget-skeleton"
			);
			const container = document.createElement("div");
			const renderOptions: ProcaptchaRenderOptions = {
				siteKey: "test-key",
			};

			await factory.createWidget(container, renderOptions, {}, true, false);

			expect(createWidgetSkeleton).toHaveBeenCalled();
		});

		it("should not create widget skeleton for invisible mode", async () => {
			const { createWidgetSkeleton } = await import(
				"@prosopo/widget-skeleton"
			);
			const container = document.createElement("div");
			const renderOptions: ProcaptchaRenderOptions = {
				siteKey: "test-key",
			};

			await factory.createWidget(container, renderOptions, {}, true, true);

			expect(createWidgetSkeleton).not.toHaveBeenCalled();
		});
	});

	describe("i18n getter", () => {
		it("should throw error when i18n is not initialized", () => {
			const newFactory = new WidgetFactory(themeResolver);

			expect(() => {
				// @ts-ignore
				const _ = newFactory.i18n;
			}).toThrow("I18n is not initialized");
		});

		it("should return i18n after initialization", async () => {
			const container = document.createElement("div");
			const renderOptions: ProcaptchaRenderOptions = {
				siteKey: "test-key",
			};

			await factory.createWidget(container, renderOptions, {}, true, false);

			expect(factory.i18n).toBeDefined();
		});
	});
});

