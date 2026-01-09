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

import { getDefaultEvents } from "@prosopo/procaptcha-common";
import type { Ti18n } from "@prosopo/locale";
import type { ProcaptchaClientConfigInput, ProcaptchaCallbacks } from "@prosopo/types";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CaptchaProps } from "../../../util/captcha/captchaProps.js";

// Mock React hooks
vi.mock("react", async () => {
	const actual = await vi.importActual("react");
	return {
		...actual,
		useState: vi.fn(() => [0, vi.fn()]),
	};
});

vi.mock("@prosopo/procaptcha-frictionless", () => ({
	ProcaptchaFrictionless: vi.fn(),
}));

vi.mock("@prosopo/procaptcha-common", () => ({
	getDefaultEvents: vi.fn((callbacks) => callbacks),
}));

// Import after mocks are set up
import { FrictionlessCaptcha } from "../../../util/captcha/components/frictionlessCaptcha.js";

describe("FrictionlessCaptcha", () => {
	let dom: JSDOM;
	let mockConfig: ProcaptchaClientConfigInput;
	let mockCallbacks: ProcaptchaCallbacks;
	let mockI18n: Ti18n;
	let mockContainer: HTMLElement;
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
		mockContainer = document.createElement("div");

		props = {
			config: mockConfig,
			callbacks: mockCallbacks,
			i18n: mockI18n,
			container: mockContainer,
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

	it("should render ProcaptchaFrictionless with correct props", async () => {
		const { useState } = await import("react");
		const { ProcaptchaFrictionless } = await import("@prosopo/procaptcha-frictionless");

		// Mock useState to return initial state and setter
		vi.mocked(useState).mockReturnValue([0, vi.fn()]);

		// Render the component
		const component = FrictionlessCaptcha(props);

		expect(useState).toHaveBeenCalledWith(0);
		expect(component.type).toBe(ProcaptchaFrictionless);
		expect(component.props.config).toBe(mockConfig);
		expect(component.props.i18n).toBe(mockI18n);
		expect(component.props.container).toBe(mockContainer);
		expect(component.props.restart).toBeDefined();
		expect(typeof component.props.restart).toBe("function");
	});

	it("should call getDefaultEvents with callbacks", async () => {
		const { useState } = await import("react");
		vi.mocked(useState).mockReturnValue([0, vi.fn()]);

		FrictionlessCaptcha(props);

		expect(getDefaultEvents).toHaveBeenCalledWith(mockCallbacks);
	});

	it("should have a restart function that updates component key", async () => {
		const { useState } = await import("react");
		const setComponentKey = vi.fn();
		vi.mocked(useState).mockReturnValue([0, setComponentKey]);

		const component = FrictionlessCaptcha(props);
		const restart = component.props.restart as () => void;

		// Call the restart function
		restart();

		// The restart function calls setComponentKey with a function that increments the previous value
		expect(setComponentKey).toHaveBeenCalledWith(expect.any(Function));

		// Verify the function passed to setComponentKey works correctly
		const updateFunction = setComponentKey.mock.calls[0][0];
		expect(updateFunction(0)).toBe(1);
		expect(updateFunction(5)).toBe(6);
	});

	it("should pass all required props to ProcaptchaFrictionless", async () => {
		const { useState } = await import("react");
		const setComponentKey = vi.fn();
		vi.mocked(useState).mockReturnValue([0, setComponentKey]);

		const component = FrictionlessCaptcha(props);

		expect(component.props).toEqual({
			config: mockConfig,
			callbacks: getDefaultEvents(mockCallbacks),
			restart: expect.any(Function),
			i18n: mockI18n,
			container: mockContainer,
		});
	});
});