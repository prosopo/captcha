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
import { WIDGET_CHECKBOX_SPINNER_CSS_CLASS } from "../constants.js";
import { darkTheme, lightTheme } from "../theme.js";
import {
	createCheckboxElement,
	getCheckboxInteractiveArea,
} from "./checkbox.js";

describe("elements/checkbox", () => {
	beforeEach(() => {
		// Ensure we have a clean DOM
		document.body.innerHTML = "";
	});

	afterEach(() => {
		document.body.innerHTML = "";
	});

	describe("createCheckboxElement", () => {
		it("should create a checkbox element with light theme", () => {
			const checkbox = createCheckboxElement(lightTheme);

			expect(checkbox).toBeInstanceOf(HTMLElement);
			expect(checkbox.className).toBe("checkbox");
		});

		it("should create a checkbox element with dark theme", () => {
			const checkbox = createCheckboxElement(darkTheme);

			expect(checkbox).toBeInstanceOf(HTMLElement);
			expect(checkbox.className).toBe("checkbox");
		});

		it("should contain checkbox markup structure", () => {
			const checkbox = createCheckboxElement(lightTheme);

			expect(checkbox.innerHTML).toContain("checkbox__outer");
			expect(checkbox.innerHTML).toContain("checkbox__wrapper");
			expect(checkbox.innerHTML).toContain("checkbox__inner");
			expect(checkbox.innerHTML).toContain("checkbox__content");
		});

		it("should contain loading spinner with correct class", () => {
			const checkbox = createCheckboxElement(lightTheme);

			expect(checkbox.innerHTML).toContain(WIDGET_CHECKBOX_SPINNER_CSS_CLASS);
		});

		it("should contain styles in innerHTML", () => {
			const checkbox = createCheckboxElement(lightTheme);

			expect(checkbox.innerHTML).toContain("<style>");
			expect(checkbox.innerHTML).toContain(".checkbox");
		});

		it("should apply theme colors to spinner", () => {
			const lightCheckbox = createCheckboxElement(lightTheme);
			const darkCheckbox = createCheckboxElement(darkTheme);

			// Check that theme colors are applied in styles
			expect(lightCheckbox.innerHTML).toContain(
				lightTheme.palette.background.contrastText,
			);
			expect(darkCheckbox.innerHTML).toContain(
				darkTheme.palette.background.contrastText,
			);
		});

		it("should include animation keyframes", () => {
			const checkbox = createCheckboxElement(lightTheme);

			expect(checkbox.innerHTML).toContain("@keyframes");
			expect(checkbox.innerHTML).toContain("rotation");
		});

		it("should have accessible spinner with aria-label", () => {
			const checkbox = createCheckboxElement(lightTheme);

			expect(checkbox.innerHTML).toContain('aria-label="Loading spinner"');
		});
	});

	describe("getCheckboxInteractiveArea", () => {
		it("should return null when element is not found", () => {
			const container = document.createElement("div");
			const result = getCheckboxInteractiveArea(container);

			expect(result).toBeNull();
		});

		it("should find interactive area in regular DOM", () => {
			const container = document.createElement("div");
			container.innerHTML = `
				<div class="checkbox__outer">
					<div class="checkbox__wrapper">
						<div class="checkbox__inner">
							<div class="checkbox__content">Interactive Area</div>
						</div>
					</div>
				</div>
			`;

			const result = getCheckboxInteractiveArea(container);

			expect(result).toBeInstanceOf(HTMLElement);
			expect(result?.className).toBe("checkbox__content");
		});

		it("should find interactive area in shadow DOM", () => {
			const container = document.createElement("div");
			const shadowRoot = container.attachShadow({ mode: "open" });
			shadowRoot.innerHTML = `
				<div class="checkbox__outer">
					<div class="checkbox__wrapper">
						<div class="checkbox__inner">
							<div class="checkbox__content">Interactive Area</div>
						</div>
					</div>
				</div>
			`;

			const result = getCheckboxInteractiveArea(container);

			expect(result).toBeInstanceOf(HTMLElement);
			expect(result?.className).toBe("checkbox__content");
		});

		it("should prefer shadow root over regular DOM", () => {
			const container = document.createElement("div");
			const shadowRoot = container.attachShadow({ mode: "open" });
			shadowRoot.innerHTML = `
				<div class="checkbox__content">Shadow DOM</div>
			`;
			container.innerHTML = `
				<div class="checkbox__content">Regular DOM</div>
			`;

			const result = getCheckboxInteractiveArea(container);

			expect(result).toBeInstanceOf(HTMLElement);
			expect(result?.textContent).toBe("Shadow DOM");
		});

		it("should return null when shadow root exists but element not found", () => {
			const container = document.createElement("div");
			const shadowRoot = container.attachShadow({ mode: "open" });
			shadowRoot.innerHTML = "<div>No checkbox content here</div>";

			const result = getCheckboxInteractiveArea(container);

			expect(result).toBeNull();
		});

		it("should work with checkbox created by createCheckboxElement", () => {
			const checkbox = createCheckboxElement(lightTheme);
			document.body.appendChild(checkbox);

			const result = getCheckboxInteractiveArea(checkbox);

			expect(result).toBeInstanceOf(HTMLElement);
			expect(result?.className).toBe("checkbox__content");
		});
	});
});
