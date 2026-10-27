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

import { LANGUAGE_HEADER } from "@prosopo/locale";
import { BUNDLE_ORIGIN_HEADER, BUNDLE_VERSION_HEADER } from "@prosopo/types";
import { describe, expect, it } from "vitest";
import {
	bundleHeaders,
	originOf,
	scriptUrlFromStack,
	widgetRequestHeaders,
} from "../requestHeaders.js";

describe("originOf", () => {
	it("reports the hosted bundle's origin", () => {
		expect(originOf("https://js.prosopo.io/js/procaptcha.bundle.js")).toBe(
			"https://js.prosopo.io",
		);
	});

	it("reports a self-hosted copy's origin without its path", () => {
		expect(
			originOf("https://www.customer.example:8443/static/js/chunk-abc.js?v=2"),
		).toBe("https://www.customer.example:8443");
	});

	it.each(["file:///app/node_modules/x.js", "not a url", "", undefined])(
		"reports nothing for %j",
		(url: string | undefined) => {
			expect(originOf(url)).toBeUndefined();
		},
	);
});

describe("scriptUrlFromStack", () => {
	it.each([
		[
			"Chrome",
			"Error\n    at https://js.prosopo.io/js/procaptcha.bundle.iife.js:2:1043\n    at Object.render (https://www.customer.example/app.js:9:3)",
		],
		[
			"Firefox and Safari",
			"@https://js.prosopo.io/js/procaptcha.bundle.iife.js:2:1043\nrender@https://www.customer.example/app.js:9:3",
		],
	])(
		"reads the running script from a %s stack",
		(_browser: string, stack: string) => {
			const url = scriptUrlFromStack(stack);
			expect(url).toBe(
				"https://js.prosopo.io/js/procaptcha.bundle.iife.js:2:1043",
			);
			expect(originOf(url)).toBe("https://js.prosopo.io");
		},
	);

	it("reports nothing without a stack", () => {
		expect(scriptUrlFromStack(undefined)).toBeUndefined();
	});
});

describe("bundleHeaders", () => {
	it("carries the version and origin", () => {
		expect(bundleHeaders("3.9.4", "https://js.prosopo.io")).toEqual({
			[BUNDLE_VERSION_HEADER]: "3.9.4",
			[BUNDLE_ORIGIN_HEADER]: "https://js.prosopo.io",
		});
	});

	it("omits the origin when it is unknown", () => {
		expect(bundleHeaders("dev", undefined)).toEqual({
			[BUNDLE_VERSION_HEADER]: "dev",
		});
	});
});

describe("widgetRequestHeaders", () => {
	it("sends the bundle version alongside the site's language", () => {
		const headers: Record<string, string> = widgetRequestHeaders("de");
		expect(headers[LANGUAGE_HEADER]).toBe("de");
		expect(headers[BUNDLE_VERSION_HEADER]).toEqual(expect.any(String));
	});
});
