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

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createLogoElement } from "./logo.js";
import { darkTheme, lightTheme } from "../theme.js";
import { WIDGET_URL, WIDGET_URL_TEXT } from "../constants.js";

describe("elements/logo", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
	});

	afterEach(() => {
		document.body.innerHTML = "";
	});

	describe("createLogoElement", () => {
		it("should create a logo element with light theme", () => {
			const logo = createLogoElement(lightTheme);

			expect(logo).toBeInstanceOf(HTMLElement);
			expect(logo.className).toBe("logo");
		});

		it("should create a logo element with dark theme", () => {
			const logo = createLogoElement(darkTheme);

			expect(logo).toBeInstanceOf(HTMLElement);
			expect(logo.className).toBe("logo");
		});

		it("should contain logo styles", () => {
			const logo = createLogoElement(lightTheme);

			expect(logo.innerHTML).toContain("<style>");
			expect(logo.innerHTML).toContain(".logo");
			expect(logo.innerHTML).toContain(".prosopo-logo");
		});

		it("should contain SVG logo", () => {
			const logo = createLogoElement(lightTheme);

			expect(logo.innerHTML).toContain("<svg");
			expect(logo.innerHTML).toContain('id="logo"');
			expect(logo.innerHTML).toContain("viewBox");
		});

		it("should contain link to WIDGET_URL", () => {
			const logo = createLogoElement(lightTheme);

			expect(logo.innerHTML).toContain(`href="${WIDGET_URL}`);
			expect(logo.innerHTML).toContain('target="_blank"');
		});

		it("should have correct aria-label", () => {
			const logo = createLogoElement(lightTheme);

			expect(logo.innerHTML).toContain(`aria-label="${WIDGET_URL_TEXT}"`);
		});

		it("should have tabindex for accessibility", () => {
			const logo = createLogoElement(lightTheme);

			expect(logo.innerHTML).toContain('tabindex="0"');
		});

		it("should have role button", () => {
			const logo = createLogoElement(lightTheme);

			expect(logo.innerHTML).toContain('role="button"');
		});

		it("should apply light theme logoFill color", () => {
			const logo = createLogoElement(lightTheme);

			expect(logo.innerHTML).toContain(
				`fill: ${lightTheme.palette.logoFill}`,
			);
			expect(logo.innerHTML).toContain(
				`color: ${lightTheme.palette.logoFill}`,
			);
		});

		it("should apply dark theme logoFill color", () => {
			const logo = createLogoElement(darkTheme);

			expect(logo.innerHTML).toContain(`fill: ${darkTheme.palette.logoFill}`);
			expect(logo.innerHTML).toContain(
				`color: ${darkTheme.palette.logoFill}`,
			);
		});

		it("should contain Prosopo text", () => {
			const logo = createLogoElement(lightTheme);

			expect(logo.innerHTML).toContain("Prosopo");
		});

		it("should contain logo text with correct class", () => {
			const logo = createLogoElement(lightTheme);

			expect(logo.innerHTML).toContain("prosopo-logo-text");
			expect(logo.innerHTML).toContain('id="logo-text"');
		});

		it("should have SVG title element", () => {
			const logo = createLogoElement(lightTheme);

			expect(logo.innerHTML).toContain("<title>");
			expect(logo.innerHTML).toContain(WIDGET_URL_TEXT);
		});

		it("should have SVG with aria-label", () => {
			const logo = createLogoElement(lightTheme);

			expect(logo.innerHTML).toContain(
				'aria-label="Prosopo Logo With Text"',
			);
		});

		it("should have correct SVG dimensions in CSS", () => {
			const logo = createLogoElement(lightTheme);

			expect(logo.innerHTML).toContain("width: 28px");
			expect(logo.innerHTML).toContain("height: 28px");
		});

		it("should have UTM campaign parameter in URL", () => {
			const logo = createLogoElement(lightTheme);

			expect(logo.innerHTML).toContain("utm_campaign=widget");
		});

		it("should have text decoration none style", () => {
			const logo = createLogoElement(lightTheme);

			expect(logo.innerHTML).toContain('style="text-decoration: none;"');
		});

		it("should be appendable to DOM", () => {
			const logo = createLogoElement(lightTheme);
			document.body.appendChild(logo);

			expect(document.body.querySelector(".logo")).toBe(logo);
		});
	});
});

