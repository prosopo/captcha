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

import type { Language } from "@prosopo/locale";
import type {
	ProcaptchaClientConfigInput,
	ProcaptchaRenderOptions,
} from "@prosopo/types";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveLanguage, setLanguage } from "../util/language.js";

const element = (language?: string): Element => {
	const div = document.createElement("div");
	if (language !== undefined) {
		div.setAttribute("data-language", language);
	}
	return div;
};

const options = (language: Language): ProcaptchaRenderOptions => ({
	siteKey: "site-key",
	language,
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("resolveLanguage", () => {
	it("returns undefined when the site sets no language", () => {
		expect(resolveLanguage(undefined, element())).toBeUndefined();
		expect(resolveLanguage(undefined, element(""))).toBeUndefined();
	});

	it("reads a single data-language code", () => {
		expect(resolveLanguage(undefined, element("tr"))).toBe("tr");
		expect(resolveLanguage(undefined, element("no"))).toBe("no");
	});

	it("takes the first supported code from a list", () => {
		expect(resolveLanguage(undefined, element("xx, tr-TR, de"))).toBe("tr");
		expect(resolveLanguage(undefined, element("de;q=0.5, fr"))).toBe("fr");
	});

	it("falls back from a region to its parent", () => {
		expect(resolveLanguage(undefined, element("zh-SG"))).toBe("zh");
		expect(resolveLanguage(undefined, element("tr-TR"))).toBe("tr");
		expect(resolveLanguage(undefined, element("nb"))).toBe("no");
		expect(resolveLanguage(undefined, element("pt-BR"))).toBe("pt-BR");
	});

	it("leaves an unsupported choice to the browser and says so", () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		expect(resolveLanguage(undefined, element("he"))).toBeUndefined();
		expect(error).toHaveBeenCalledWith(expect.stringContaining("he"));
	});

	it("prefers renderOptions.language over data-language", () => {
		expect(resolveLanguage(options("de"), element("tr"))).toBe("de");
	});
});

describe("setLanguage", () => {
	it("sets config.language to the resolved code", () => {
		const config: ProcaptchaClientConfigInput = { account: { address: "a" } };
		setLanguage(undefined, element("xx,tr"), config);
		expect(config.language).toBe("tr");
	});

	it("leaves config.language alone when nothing resolves", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const config: ProcaptchaClientConfigInput = {
			account: { address: "a" },
			language: "fr",
		};
		setLanguage(undefined, element("xx"), config);
		expect(config.language).toBe("fr");
	});
});
