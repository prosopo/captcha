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

import { describe, expect, test } from "vitest";
import { widgetLinkUrl } from "../widgetLink.js";

const PAGE = "https://prosopo.io/what-is-procaptcha/";

describe("widgetLinkUrl", () => {
	test("carries the site, site key, clicked element and language", () => {
		expect(
			widgetLinkUrl(PAGE, "logo", {
				host: "pimeyes.com",
				siteKey: "5Fsite",
				language: "de",
			}),
		).toBe(`${PAGE}?ref=pimeyes.com&utm_campaign=5Fsite&utm_medium=logo&hl=de`);
	});

	test("says which part of the widget was clicked", () => {
		expect(
			new URL(widgetLinkUrl(PAGE, "error")).searchParams.get("utm_medium"),
		).toBe("error");
	});

	test("leaves out what it was not given", () => {
		expect(widgetLinkUrl(PAGE, "logo")).toBe(`${PAGE}?utm_medium=logo`);
	});

	test("keeps a hostile value inside its own parameter", () => {
		const url: URL = new URL(
			widgetLinkUrl(PAGE, "logo", {
				host: "example.com",
				language: "en&ref=evil.com",
			}),
		);
		expect(url.searchParams.getAll("ref")).toEqual(["example.com"]);
		expect(url.searchParams.get("hl")).toBe("en&ref=evil.com");
	});

	test("keeps the destination's path", () => {
		expect(
			new URL(widgetLinkUrl("https://docs.prosopo.io/en/basics/faq/", "error"))
				.pathname,
		).toBe("/en/basics/faq/");
	});
});
