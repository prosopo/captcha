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

import type {
	ProcaptchaClientConfigOutput,
	ProcaptchaRenderOptions,
} from "@prosopo/types";
import { describe, expect, it } from "vitest";
import { createConfig } from "../util/configCreator.js";
import { setIntegration, siteIntegration } from "../util/integration.js";

const container = (attribute?: string): HTMLElement => {
	const div: HTMLElement = document.createElement("div");
	if (attribute !== undefined) {
		div.setAttribute("data-integration", attribute);
	}
	return div;
};

// The markup MC4WP renders the widget into.
const mc4wpContainer = (): HTMLElement => {
	const host: HTMLElement = document.createElement("mc4wp-procaptcha");
	const captcha: HTMLElement = document.createElement("div");
	captcha.className = "mc4wp-procaptcha__captcha";
	host.appendChild(captcha);
	return captcha;
};

const options = (integration?: string): ProcaptchaRenderOptions => ({
	siteKey: "site-key",
	integration,
});

describe("siteIntegration", () => {
	it("is undefined on a plain page", () => {
		expect(siteIntegration(undefined, container())).toBeUndefined();
	});

	it("recognises a widget rendered by MC4WP", () => {
		expect(siteIntegration(options(), mc4wpContainer())).toBe("mc4wp");
	});

	it("recognises a widget rendered by our WordPress plugin", () => {
		const host: HTMLElement = document.createElement(
			"prosopo-procaptcha-wp-widget",
		);
		const captcha: HTMLElement = document.createElement("div");
		host.appendChild(captcha);
		expect(siteIntegration(undefined, captcha)).toBe("procaptcha-wordpress");
	});

	it("reads data-integration", () => {
		expect(siteIntegration(undefined, container("Gravity-Forms"))).toBe(
			"gravity-forms",
		);
	});

	it("prefers the render option over the attribute", () => {
		expect(siteIntegration(options("elementor"), container("divi"))).toBe(
			"elementor",
		);
	});

	it("ignores an invalid name and falls back to detection", () => {
		expect(siteIntegration(options("not valid"), mc4wpContainer())).toBe(
			"mc4wp",
		);
		expect(siteIntegration(options("not valid"), container())).toBeUndefined();
	});
});

describe("setIntegration", () => {
	it("sets the config only when there is an integration", () => {
		const config: ProcaptchaClientConfigOutput = createConfig({
			siteKey: "site-key",
		});
		setIntegration(undefined, container(), config);
		expect(config.integration).toBeUndefined();

		setIntegration(undefined, mc4wpContainer(), config);
		expect(config.integration).toBe("mc4wp");
	});
});
