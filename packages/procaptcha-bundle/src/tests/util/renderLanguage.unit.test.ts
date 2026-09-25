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

import type { Ti18n } from "@prosopo/locale";
import { getDefaultCallbacks } from "@prosopo/procaptcha-common";
import type {
	ProcaptchaClientConfigInput,
	ProcaptchaRenderOptions,
} from "@prosopo/types";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type {
	BundleCaptchaHandle,
	BundleCaptchaProps,
} from "../../util/captcha/components/bundleCaptcha.js";

const mounted = vi.hoisted(() => ({
	configs: [] as ProcaptchaClientConfigInput[],
}));

vi.mock("../../util/captcha/components/bundleCaptcha.js", () => ({
	mountBundleCaptcha: (
		_target: HTMLElement,
		props: BundleCaptchaProps,
	): BundleCaptchaHandle => {
		mounted.configs.push(props.config);
		return { destroy: () => undefined };
	},
}));

const { CaptchaRenderer } = await import(
	"../../util/captcha/captchaRenderer.js"
);

const i18n: Ti18n = {
	language: "en",
	isInitialized: true,
	t: (key: string) => key,
	changeLanguage: () => Promise.resolve(),
	hasLoadedNamespace: () => true,
	on: () => undefined,
	off: () => undefined,
};

let container: HTMLDivElement;

beforeEach(() => {
	mounted.configs.length = 0;
	container = document.createElement("div");
	document.body.appendChild(container);
	vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
	container.remove();
	vi.restoreAllMocks();
});

const render = (language: string): ProcaptchaClientConfigInput => {
	// Render options come from untyped page scripts, so any string can arrive.
	const options: ProcaptchaRenderOptions = JSON.parse(
		JSON.stringify({
			siteKey: "5Esjpa4ogV3CnkueyiXet7LL5z5mhvEyi5XJnDGbD2kjzD8W",
			language,
		}),
	);
	new CaptchaRenderer().renderCaptcha(
		container,
		options,
		getDefaultCallbacks(container),
		true,
		i18n,
		false,
		container,
	);
	const config = mounted.configs[0];
	if (!config) throw new Error("expected the widget to mount");
	return config;
};

describe("render language", () => {
	test("an unsupported language falls back to English instead of failing the mount", () => {
		expect(render("he").language).toBe("en");
	});

	test("a supported language is kept", () => {
		expect(render("ar").language).toBe("ar");
	});
});
