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

import {
	type ProcaptchaClientConfigOutput,
	ProcaptchaConfigSchema,
	type ProcaptchaRenderOptions,
	StartModeEnum,
} from "@prosopo/types";
import { JSDOM } from "jsdom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	START_MODE_ATTRIBUTE,
	resolveStartMode,
	setStartMode,
} from "../../util/startMode.js";

const SITE_KEY = "5site";

const makeConfig = (): ProcaptchaClientConfigOutput =>
	ProcaptchaConfigSchema.parse({ account: { address: SITE_KEY } });

const makeElement = (attributes: Record<string, string> = {}): Element => {
	const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
	const element = dom.window.document.createElement("div");
	for (const [name, value] of Object.entries(attributes)) {
		element.setAttribute(name, value);
	}
	return element;
};

const renderOptions = (
	overrides: Partial<ProcaptchaRenderOptions> = {},
): ProcaptchaRenderOptions => ({ siteKey: SITE_KEY, ...overrides });

describe("resolveStartMode", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("defaults to auto", () => {
		expect(resolveStartMode(renderOptions(), makeElement())).toBe(
			StartModeEnum.auto,
		);
		expect(resolveStartMode(undefined, makeElement())).toBe(StartModeEnum.auto);
	});

	it("reads the start mode from the render options", () => {
		expect(
			resolveStartMode(
				renderOptions({ startMode: StartModeEnum.manual }),
				makeElement(),
			),
		).toBe(StartModeEnum.manual);
	});

	it("reads the start mode from the data attribute", () => {
		expect(
			resolveStartMode(
				renderOptions(),
				makeElement({ [START_MODE_ATTRIBUTE]: "manual" }),
			),
		).toBe(StartModeEnum.manual);
	});

	it("prefers the render options over the attribute", () => {
		expect(
			resolveStartMode(
				renderOptions({ startMode: StartModeEnum.auto }),
				makeElement({ [START_MODE_ATTRIBUTE]: "manual" }),
			),
		).toBe(StartModeEnum.auto);
	});

	it("falls back to auto on an unknown value and says so", () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});

		expect(
			resolveStartMode(
				renderOptions(),
				makeElement({ [START_MODE_ATTRIBUTE]: "later" }),
			),
		).toBe(StartModeEnum.auto);
		expect(error).toHaveBeenCalledTimes(1);
		expect(error.mock.calls[0]?.[0]).toContain("later");
	});
});

describe("setStartMode", () => {
	it("writes the resolved mode onto the config", () => {
		const config = makeConfig();
		expect(config.startMode).toBe(StartModeEnum.auto);

		setStartMode(
			renderOptions(),
			makeElement({ [START_MODE_ATTRIBUTE]: "manual" }),
			config,
		);

		expect(config.startMode).toBe(StartModeEnum.manual);
	});
});
