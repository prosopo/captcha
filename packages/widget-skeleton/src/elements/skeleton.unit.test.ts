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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	WIDGET_BORDER_RADIUS,
	WIDGET_INNER_HEIGHT,
	WIDGET_MAX_WIDTH,
	WIDGET_MIN_HEIGHT,
	WIDGET_OUTER_HEIGHT,
	WIDGET_PADDING,
} from "../constants.js";
import { darkTheme, lightTheme } from "../theme.js";
import { createWidgetSkeletonElement } from "./skeleton.js";

describe("elements/skeleton", () => {
	let originalEnv: string | undefined;

	beforeEach(() => {
		document.body.innerHTML = "";
		originalEnv = process.env.NODE_ENV;
	});

	afterEach(() => {
		document.body.innerHTML = "";
		process.env.NODE_ENV = originalEnv;
		vi.restoreAllMocks();
	});

	describe("createWidgetSkeletonElement", () => {
		it("should create a widget skeleton element with light theme", () => {
			const skeleton = createWidgetSkeletonElement(lightTheme);

			expect(skeleton).toBeInstanceOf(HTMLElement);
			expect(skeleton.className).toBe("widget");
		});

		it("should create a widget skeleton element with dark theme", () => {
			const skeleton = createWidgetSkeletonElement(darkTheme);

			expect(skeleton).toBeInstanceOf(HTMLElement);
			expect(skeleton.className).toBe("widget");
		});

		it("should contain widget structure", () => {
			const skeleton = createWidgetSkeletonElement(lightTheme);

			expect(skeleton.innerHTML).toContain("widget__outer");
			expect(skeleton.innerHTML).toContain("widget__wrapper");
			expect(skeleton.innerHTML).toContain("widget__inner");
			expect(skeleton.innerHTML).toContain("widget__dimensions");
			expect(skeleton.innerHTML).toContain("widget__content");
		});

		it("should contain checkbox element", () => {
			const skeleton = createWidgetSkeletonElement(lightTheme);

			const checkbox = skeleton.querySelector(".checkbox");
			expect(checkbox).toBeInstanceOf(HTMLElement);
		});

		it("should contain logo element", () => {
			const skeleton = createWidgetSkeletonElement(lightTheme);

			const logo = skeleton.querySelector(".logo");
			expect(logo).toBeInstanceOf(HTMLElement);
		});

		it("should contain widget styles", () => {
			const skeleton = createWidgetSkeletonElement(lightTheme);

			expect(skeleton.innerHTML).toContain("<style>");
			expect(skeleton.innerHTML).toContain(".widget");
		});

		it("should apply theme font family", () => {
			const skeleton = createWidgetSkeletonElement(lightTheme);

			expect(skeleton.innerHTML).toContain(lightTheme.font.fontFamily);
		});

		it("should apply theme font color", () => {
			const skeleton = createWidgetSkeletonElement(lightTheme);

			expect(skeleton.innerHTML).toContain(lightTheme.font.color);
		});

		it("should apply theme background color", () => {
			const skeleton = createWidgetSkeletonElement(lightTheme);

			expect(skeleton.innerHTML).toContain(
				lightTheme.palette.background.default,
			);
		});

		it("should apply different background for dark theme", () => {
			const lightSkeleton = createWidgetSkeletonElement(lightTheme);
			const darkSkeleton = createWidgetSkeletonElement(darkTheme);

			expect(lightSkeleton.innerHTML).toContain(
				lightTheme.palette.background.default,
			);
			expect(darkSkeleton.innerHTML).toContain(
				darkTheme.palette.background.default,
			);
		});

		it("should include widget dimensions in styles", () => {
			const skeleton = createWidgetSkeletonElement(lightTheme);

			expect(skeleton.innerHTML).toContain(WIDGET_MAX_WIDTH);
			expect(skeleton.innerHTML).toContain(WIDGET_MIN_HEIGHT);
			expect(skeleton.innerHTML).toContain(`${WIDGET_OUTER_HEIGHT}px`);
			expect(skeleton.innerHTML).toContain(`${WIDGET_INNER_HEIGHT}px`);
		});

		it("should include border and padding styles", () => {
			const skeleton = createWidgetSkeletonElement(lightTheme);

			expect(skeleton.innerHTML).toContain(WIDGET_BORDER_RADIUS);
			expect(skeleton.innerHTML).toContain(WIDGET_PADDING);
		});

		it("should have data-cy attribute in development mode", () => {
			process.env.NODE_ENV = "development";
			const skeleton = createWidgetSkeletonElement(lightTheme);

			const dimensions = skeleton.querySelector(".widget__dimensions");
			expect(dimensions?.getAttribute("data-cy")).toBe("captcha-checkbox");
		});

		it("should not have data-cy attribute in production mode", () => {
			process.env.NODE_ENV = "production";
			const skeleton = createWidgetSkeletonElement(lightTheme);

			const dimensions = skeleton.querySelector(".widget__dimensions");
			expect(dimensions?.getAttribute("data-cy")).toBeNull();
		});

		it("should have data-cy attribute in test mode (non-production)", () => {
			process.env.NODE_ENV = "test";
			const skeleton = createWidgetSkeletonElement(lightTheme);

			const dimensions = skeleton.querySelector(".widget__dimensions");
			// isDevMode returns true when mode is not "production"
			expect(dimensions?.getAttribute("data-cy")).toBe("captcha-checkbox");
		});

		it("should be appendable to DOM", () => {
			const skeleton = createWidgetSkeletonElement(lightTheme);
			document.body.appendChild(skeleton);

			expect(document.body.querySelector(".widget")).toBe(skeleton);
		});

		it("should have correct widget structure hierarchy", () => {
			const skeleton = createWidgetSkeletonElement(lightTheme);

			const outer = skeleton.querySelector(".widget__outer");
			const wrapper = skeleton.querySelector(".widget__wrapper");
			const inner = skeleton.querySelector(".widget__inner");
			const dimensions = skeleton.querySelector(".widget__dimensions");
			const content = skeleton.querySelector(".widget__content");

			expect(outer).toBeInstanceOf(HTMLElement);
			expect(wrapper).toBeInstanceOf(HTMLElement);
			expect(inner).toBeInstanceOf(HTMLElement);
			expect(dimensions).toBeInstanceOf(HTMLElement);
			expect(content).toBeInstanceOf(HTMLElement);
		});

		it("should replace placeholder checkbox with actual checkbox element", () => {
			const skeleton = createWidgetSkeletonElement(lightTheme);

			const checkboxes = skeleton.querySelectorAll(".checkbox");
			expect(checkboxes.length).toBe(1);
		});

		it("should replace placeholder logo with actual logo element", () => {
			const skeleton = createWidgetSkeletonElement(lightTheme);

			const logos = skeleton.querySelectorAll(".logo");
			expect(logos.length).toBe(1);
		});

		it("should handle undefined NODE_ENV", () => {
			const originalEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = undefined;
			const skeleton = createWidgetSkeletonElement(lightTheme);

			expect(skeleton).toBeInstanceOf(HTMLElement);
			process.env.NODE_ENV = originalEnv;
		});

		it("should handle empty string NODE_ENV", () => {
			const originalEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = "";
			const skeleton = createWidgetSkeletonElement(lightTheme);

			const dimensions = skeleton.querySelector(".widget__dimensions");
			expect(dimensions?.getAttribute("data-cy")).toBe("captcha-checkbox");
			process.env.NODE_ENV = originalEnv;
		});
	});
});
