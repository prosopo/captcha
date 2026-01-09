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

import { getDefaultEvents } from "@prosopo/procaptcha-common";
import type { Ti18n } from "@prosopo/locale";
import type { ProcaptchaClientConfigInput, ProcaptchaCallbacks } from "@prosopo/types";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CaptchaProps } from "../../../util/captcha/captchaProps.js";

vi.mock("@prosopo/procaptcha-react", () => ({
	Procaptcha: vi.fn(),
}));

vi.mock("@prosopo/procaptcha-common", () => ({
	getDefaultEvents: vi.fn((callbacks) => callbacks),
}));

// Import after mocks are set up
import { ImageCaptcha } from "../../../util/captcha/components/imageCaptcha.js";

describe("ImageCaptcha", () => {
	let dom: JSDOM;
	let mockConfig: ProcaptchaClientConfigInput;
	let mockCallbacks: ProcaptchaCallbacks;
	let mockI18n: Ti18n;
	let props: CaptchaProps;

	beforeEach(() => {
		dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
			url: "http://localhost",
		});
		global.document = dom.window.document;
		global.window = dom.window as unknown as Window & typeof globalThis;

		mockConfig = {
			account: { address: "test-address" },
			captchas: { solutionTimeout: 300 },
		} as ProcaptchaClientConfigInput;

		mockCallbacks = {
			onHuman: vi.fn(),
			onError: vi.fn(),
		};

		mockI18n = {} as Ti18n;

		props = {
			config: mockConfig,
			callbacks: mockCallbacks,
			i18n: mockI18n,
			container: document.createElement("div"),
		};

		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		// biome-ignore lint/suspicious/noExplicitAny: TODO fix any
		(global as any).document = undefined;
		// biome-ignore lint/suspicious/noExplicitAny: TODO fix any
		(global as any).window = undefined;
	});

	it("should render Procaptcha with correct props", async () => {
		const { Procaptcha } = await import("@prosopo/procaptcha-react");

		// Render the component
		const component = ImageCaptcha(props);

		expect(component.type).toBe(Procaptcha);
		expect(component.props.config).toBe(mockConfig);
		expect(component.props.i18n).toBe(mockI18n);
	});

	it("should call getDefaultEvents with callbacks", async () => {
		ImageCaptcha(props);

		expect(getDefaultEvents).toHaveBeenCalledWith(mockCallbacks);
	});

	it("should pass all required props to Procaptcha", async () => {
		const component = ImageCaptcha(props);

		expect(component.props).toEqual({
			config: mockConfig,
			callbacks: getDefaultEvents(mockCallbacks),
			i18n: mockI18n,
		});
	});

	it("should not pass container prop to Procaptcha", async () => {
		// ImageCaptcha specifically doesn't pass the container prop to Procaptcha
		const component = ImageCaptcha(props);

		expect(component.props.container).toBeUndefined();
	});
});