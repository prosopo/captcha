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
// @vitest-environment jsdom

import type { Ti18n } from "@prosopo/locale";
import { getDefaultCallbacks } from "@prosopo/procaptcha-common";
import type { ProcaptchaRenderOptions } from "@prosopo/types";
import { afterEach, describe, expect, test, vi } from "vitest";
import { CaptchaRenderer } from "../util/captcha/captchaRenderer.js";
import type { BundleCaptchaHandle } from "../util/captcha/components/bundleCaptcha.js";
import { WidgetFactory } from "../util/widgetFactory.js";
import { WidgetThemeResolver } from "../util/widgetThemeResolver.js";

const LOADING_IN: Readonly<Record<string, string>> = {
	de: "Wird geladen",
	ar: "جارٍ التحميل",
};

const i18nIn = (language: string): Ti18n => ({
	language,
	isInitialized: true,
	t: (key: string): string =>
		key === "WIDGET.LOADING" ? (LOADING_IN[language] ?? key) : key,
	changeLanguage: async (): Promise<void> => undefined,
	hasLoadedNamespace: (): boolean => true,
	on: (): void => undefined,
	off: (): void => undefined,
});

class TestWidgetFactory extends WidgetFactory {
	public constructor(
		private readonly browserLanguage: string,
		private readonly loaded: Ti18n | null = null,
	) {
		super(new WidgetThemeResolver());
	}

	protected override get loadedI18n(): Ti18n | null {
		return this.loaded;
	}

	override get i18n(): Ti18n {
		return this.loaded ?? i18nIn(this.browserLanguage);
	}

	protected override async getCaptchaRenderer(): Promise<CaptchaRenderer> {
		const renderer = new CaptchaRenderer();
		const handle: BundleCaptchaHandle = { destroy: (): void => undefined };
		vi.spyOn(renderer, "renderCaptcha").mockReturnValue(handle);
		return renderer;
	}
}

const render = async (
	options: Partial<ProcaptchaRenderOptions>,
	browserLanguage = "en",
	invisible = false,
): Promise<HTMLElement> => {
	const container: HTMLElement = document.createElement("div");
	document.body.appendChild(container);
	const { container: widget } = await new TestWidgetFactory(
		browserLanguage,
	).createWidget(
		container,
		{ siteKey: "site-key", ...options },
		getDefaultCallbacks(container),
		true,
		invisible,
	);
	return widget;
};

const spinnerLabel = async (
	loaded: Ti18n | null,
	options: Partial<ProcaptchaRenderOptions>,
): Promise<string | null> => {
	const container: HTMLElement = document.createElement("div");
	document.body.appendChild(container);
	const { container: widget } = await new TestWidgetFactory(
		loaded?.language ?? "en",
		loaded,
	).createWidget(
		container,
		{ siteKey: "site-key", ...options },
		getDefaultCallbacks(container),
	);
	return (
		widget
			.querySelector(".prosopo-checkbox")
			?.shadowRoot?.querySelector('[role="progressbar"]')
			?.getAttribute("aria-label") ?? null
	);
};

afterEach(() => {
	document.body.innerHTML = "";
	document.documentElement.removeAttribute("dir");
});

describe("widget direction", () => {
	test("is rtl for an Arabic widget", async () => {
		expect((await render({ language: "ar" })).dir).toBe("rtl");
	});

	test("is ltr for an English widget on an rtl page", async () => {
		document.documentElement.dir = "rtl";
		expect((await render({ language: "en" })).dir).toBe("ltr");
	});

	test("follows the detected language when the site names none", async () => {
		expect((await render({}, "ar")).dir).toBe("rtl");
		expect((await render({}, "de")).dir).toBe("ltr");
	});

	test("is set on the host that holds the skeleton", async () => {
		const widget: HTMLElement = await render({ language: "ar" });
		expect(widget.tagName.toLowerCase()).toBe("prosopo-procaptcha");
		expect(widget.querySelector(".prosopo-widget__content")).not.toBeNull();
	});

	test("is set in invisible mode too", async () => {
		expect((await render({ language: "ar" }, "en", true)).dir).toBe("rtl");
	});
});

describe("loading spinner label", () => {
	test("is translated once i18n is loaded in the widget's language", async () => {
		expect(await spinnerLabel(i18nIn("de"), { language: "de" })).toBe(
			"Wird geladen",
		);
	});

	test("uses the loaded language when the site names none", async () => {
		expect(await spinnerLabel(i18nIn("ar"), {})).toBe("جارٍ التحميل");
	});

	test("falls back to English rather than show another widget's language", async () => {
		expect(await spinnerLabel(i18nIn("ar"), { language: "de" })).toBe(
			"Loading",
		);
	});

	test("falls back to English before i18n has loaded", async () => {
		expect(await spinnerLabel(null, { language: "de" })).toBe("Loading");
	});
});
