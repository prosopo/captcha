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

import { CaptchaType } from "@prosopo/types";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CaptchaComponentProvider } from "../../../util/captcha/captchaComponentProvider.js";
import type { CaptchaProps } from "../../../util/captcha/captchaProps.js";

vi.mock("../../../util/captcha/components/frictionlessCaptcha.js");
vi.mock("../../../util/captcha/components/imageCaptcha.js");
vi.mock("../../../util/captcha/components/powCaptcha.js");

describe("CaptchaComponentProvider", () => {
	let dom: JSDOM;
	let provider: CaptchaComponentProvider;
	let mockProps: CaptchaProps;

	beforeEach(() => {
		dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
		global.document = dom.window.document;
		provider = new CaptchaComponentProvider();
		mockProps = {
			config: {
				account: { address: "test" },
			} as CaptchaProps["config"],
			callbacks: {},
			i18n: {} as CaptchaProps["i18n"],
			container: document.createElement("div"),
		};
		vi.spyOn(console, "log").mockImplementation(() => { });
	});

	afterEach(() => {
		vi.restoreAllMocks();
		// biome-ignore lint/suspicious/noExplicitAny: TODO fix any
		(global as any).document = undefined;
	});

	it("should return FrictionlessCaptcha component for frictionless type", async () => {
		const { FrictionlessCaptcha } = await import("../../../util/captcha/components/frictionlessCaptcha.js");

		const component = provider.getCaptchaComponent(
			CaptchaType.frictionless,
			mockProps,
		);

		expect(component).toBeDefined();
		expect(component.type).toBe(FrictionlessCaptcha);
		expect(console.log).toHaveBeenCalledWith("rendering frictionless");
	});

	it("should return ImageCaptcha component for image type", async () => {
		const { ImageCaptcha } = await import("../../../util/captcha/components/imageCaptcha.js");

		const component = provider.getCaptchaComponent(
			CaptchaType.image,
			mockProps,
		);

		expect(component).toBeDefined();
		expect(component.type).toBe(ImageCaptcha);
		expect(console.log).toHaveBeenCalledWith("rendering image");
	});

	it("should return PowCaptcha component for pow type", async () => {
		const { PowCaptcha } = await import("../../../util/captcha/components/powCaptcha.js");

		const component = provider.getCaptchaComponent(CaptchaType.pow, mockProps);

		expect(component).toBeDefined();
		expect(component.type).toBe(PowCaptcha);
		expect(console.log).toHaveBeenCalledWith("rendering pow");
	});

	it("should throw error for invisible type", () => {
		expect(() => {
			provider.getCaptchaComponent(CaptchaType.invisible, mockProps);
		}).toThrow("Not Implemented");
	});

	it("should pass props correctly to component", async () => {
		const component = provider.getCaptchaComponent(
			CaptchaType.frictionless,
			mockProps,
		);

		expect(component).toBeDefined();
		expect(component.props).toEqual(mockProps);
	});
});
