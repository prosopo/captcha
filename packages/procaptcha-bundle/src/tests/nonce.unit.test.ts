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
import { afterEach, describe, expect, it } from "vitest";
import { createConfig } from "../util/configCreator.js";
import { resolveNonce, setNonce } from "../util/nonce.js";

const container = (dataNonce?: string): HTMLElement => {
	const div: HTMLElement = document.createElement("div");
	if (dataNonce !== undefined) {
		div.setAttribute("data-nonce", dataNonce);
	}
	return div;
};

const options = (nonce?: string): ProcaptchaRenderOptions => ({
	siteKey: "site-key",
	nonce,
});

const addNoncedScript = (nonce: string): void => {
	const script: HTMLScriptElement = document.createElement("script");
	script.nonce = nonce;
	script.setAttribute("nonce", nonce);
	document.head.appendChild(script);
};

afterEach(() => {
	for (const script of Array.from(document.querySelectorAll("script"))) {
		script.remove();
	}
});

describe("resolveNonce", () => {
	it("is undefined on a page without a nonce", () => {
		expect(resolveNonce(options(), container())).toBeUndefined();
	});

	it("prefers renderOptions.nonce", () => {
		addNoncedScript("from-script");
		expect(resolveNonce(options("from-options"), container("from-data"))).toBe(
			"from-options",
		);
	});

	it("falls back to data-nonce", () => {
		addNoncedScript("from-script");
		expect(resolveNonce(options(), container("from-data"))).toBe("from-data");
	});

	it("falls back to the nonce of a script on the page", () => {
		addNoncedScript("from-script");
		expect(resolveNonce(undefined, container())).toBe("from-script");
	});
});

describe("setNonce", () => {
	it("puts the resolved nonce on the config", () => {
		const config: ProcaptchaClientConfigOutput = createConfig({
			siteKey: "site-key",
		});
		setNonce(options("from-options"), container(), config);
		expect(config.nonce).toBe("from-options");
	});

	it("leaves the config alone when there is no nonce", () => {
		const config: ProcaptchaClientConfigOutput = createConfig({
			siteKey: "site-key",
		});
		setNonce(options(), container(), config);
		expect(config.nonce).toBeUndefined();
	});
});
