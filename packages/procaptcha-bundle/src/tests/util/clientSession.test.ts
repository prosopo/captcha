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
	INPUT_LIMITS,
	type ProcaptchaClientConfigOutput,
	ProcaptchaConfigSchema,
	type ProcaptchaRenderOptions,
} from "@prosopo/types";
import { JSDOM } from "jsdom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setClientSessionId } from "../../util/clientSession.js";

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

describe("setClientSessionId", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("leaves the config untouched when the site uses no sessions", () => {
		const config = makeConfig();
		setClientSessionId(renderOptions(), makeElement(), config);
		expect(config.clientSessionId).toBeUndefined();
	});

	it("reads the session id from the render options", () => {
		const config = makeConfig();
		setClientSessionId(
			renderOptions({ sessionId: "jti-from-options" }),
			makeElement(),
			config,
		);
		expect(config.clientSessionId).toBe("jti-from-options");
	});

	it("falls back to the data-sessionid attribute", () => {
		const config = makeConfig();
		setClientSessionId(
			renderOptions(),
			makeElement({ "data-sessionid": "jti-from-attribute" }),
			config,
		);
		expect(config.clientSessionId).toBe("jti-from-attribute");
	});

	it("prefers the render option over the attribute", () => {
		const config = makeConfig();
		setClientSessionId(
			renderOptions({ sessionId: "jti-from-options" }),
			makeElement({ "data-sessionid": "jti-from-attribute" }),
			config,
		);
		expect(config.clientSessionId).toBe("jti-from-options");
	});

	it("works when renderOptions are absent entirely (implicit render)", () => {
		const config = makeConfig();
		setClientSessionId(
			undefined,
			makeElement({ "data-sessionid": "jti-implicit" }),
			config,
		);
		expect(config.clientSessionId).toBe("jti-implicit");
	});

	it("drops an oversized session id the provider would reject", () => {
		const error = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined);
		const config = makeConfig();
		setClientSessionId(
			renderOptions({ sessionId: "x".repeat(INPUT_LIMITS.ID + 1) }),
			makeElement(),
			config,
		);
		expect(config.clientSessionId).toBeUndefined();
		expect(error).toHaveBeenCalled();
	});

	it("keeps a session id exactly at the limit", () => {
		const config = makeConfig();
		const atLimit = "x".repeat(INPUT_LIMITS.ID);
		setClientSessionId(
			renderOptions({ sessionId: atLimit }),
			makeElement(),
			config,
		);
		expect(config.clientSessionId).toBe(atLimit);
	});
});
