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

import { describe, expectTypeOf, test } from "vitest";
import type {
	WIDGET_BORDER,
	WIDGET_BORDER_RADIUS,
	WIDGET_CHECKBOX_SPINNER_CSS_CLASS,
	WIDGET_DIMENSIONS,
	WIDGET_INNER_HEIGHT,
	WIDGET_MAX_WIDTH,
	WIDGET_MIN_HEIGHT,
	WIDGET_OUTER_HEIGHT,
	WIDGET_PADDING,
	WIDGET_URL,
	WIDGET_URL_TEXT,
} from "./constants.js";
import {
	createCheckboxElement,
	getCheckboxInteractiveArea,
} from "./elements/checkbox.js";
import { createLogoElement } from "./elements/logo.js";
import { createWidgetSkeletonElement } from "./elements/skeleton.js";
import { type Theme, darkTheme, lightTheme } from "./theme.js";
import { createWebComponent } from "./webComponent/createWebComponent.js";
import { createWidgetSkeleton } from "./webComponent/createWidget.js";

describe("types", () => {
	describe("Theme type", () => {
		test("Theme should accept lightTheme", () => {
			const theme: Theme = lightTheme;
			expectTypeOf(theme).toMatchTypeOf<Theme>();
			expectTypeOf(theme).not.toBeAny();
		});

		test("Theme should accept darkTheme", () => {
			const theme: Theme = darkTheme;
			expectTypeOf(theme).toMatchTypeOf<Theme>();
			expectTypeOf(theme).not.toBeAny();
		});

		test("Theme should have correct palette structure", () => {
			const theme: Theme = lightTheme;
			expectTypeOf(theme.palette.primary.main).toBeString();
			expectTypeOf(theme.palette.primary.contrastText).toBeString();
			expectTypeOf(theme.palette.background.default).toBeString();
			expectTypeOf(theme.palette.background.contrastText).toBeString();
			expect(theme.palette.mode === "light" || theme.palette.mode === "dark").toBe(true);
		});

		test("Theme should have correct spacing structure", () => {
			expectTypeOf<Theme["spacing"]>().toMatchTypeOf<{
				unit: number;
				half: number;
			}>();
		});

		test("Theme should have correct font structure", () => {
			expectTypeOf<Theme["font"]>().toMatchTypeOf<{
				fontFamily: string;
				color: string;
			}>();
		});

		test("lightTheme should match Theme type", () => {
			expectTypeOf(lightTheme).toMatchTypeOf<Theme>();
		});

		test("darkTheme should match Theme type", () => {
			expectTypeOf(darkTheme).toMatchTypeOf<Theme>();
		});
	});

	describe("createWidgetSkeleton types", () => {
		test("createWidgetSkeleton return type", () => {
			const container = document.createElement("div");
			const result = createWidgetSkeleton(container, lightTheme, "test-widget");

			expectTypeOf(result).toMatchTypeOf<{
				widgetInteractiveArea: HTMLElement;
				webComponent: HTMLElement;
			}>();
			expectTypeOf(result).not.toBeAny();
		});

		test("createWidgetSkeleton widgetInteractiveArea type", () => {
			const container = document.createElement("div");
			const result = createWidgetSkeleton(container, lightTheme, "test-widget");

			expectTypeOf(result.widgetInteractiveArea).toMatchTypeOf<HTMLElement>();
			expectTypeOf(result.widgetInteractiveArea).not.toBeAny();
		});

		test("createWidgetSkeleton webComponent type", () => {
			const container = document.createElement("div");
			const result = createWidgetSkeleton(container, lightTheme, "test-widget");

			expectTypeOf(result.webComponent).toMatchTypeOf<HTMLElement>();
			expectTypeOf(result.webComponent).not.toBeAny();
		});

		test("createWidgetSkeleton accepts Element as container", () => {
			const container = document.createElement("div");
			expectTypeOf(createWidgetSkeleton).parameter(0).toMatchTypeOf<Element>();
		});

		test("createWidgetSkeleton accepts Theme as theme parameter", () => {
			expectTypeOf(createWidgetSkeleton).parameter(1).toMatchTypeOf<Theme>();
		});

		test("createWidgetSkeleton accepts string as webComponentTag", () => {
			expectTypeOf(createWidgetSkeleton).parameter(2).toMatchTypeOf<string>();
		});
	});

	describe("createCheckboxElement types", () => {
		test("createCheckboxElement return type", () => {
			const checkbox = createCheckboxElement(lightTheme);
			expectTypeOf(checkbox).toMatchTypeOf<HTMLElement>();
			expectTypeOf(checkbox).not.toBeAny();
		});

		test("createCheckboxElement accepts Theme", () => {
			expectTypeOf(createCheckboxElement).parameter(0).toMatchTypeOf<Theme>();
		});
	});

	describe("getCheckboxInteractiveArea types", () => {
		test("getCheckboxInteractiveArea return type", () => {
			const element = document.createElement("div");
			const result = getCheckboxInteractiveArea(element);
			expectTypeOf(result).toMatchTypeOf<HTMLElement | null>();
			expectTypeOf(result).not.toBeAny();
		});

		test("getCheckboxInteractiveArea accepts HTMLElement", () => {
			expectTypeOf(getCheckboxInteractiveArea)
				.parameter(0)
				.toMatchTypeOf<HTMLElement>();
		});
	});

	describe("createLogoElement types", () => {
		test("createLogoElement return type", () => {
			const logo = createLogoElement(lightTheme);
			expectTypeOf(logo).toMatchTypeOf<HTMLElement>();
			expectTypeOf(logo).not.toBeAny();
		});

		test("createLogoElement accepts Theme", () => {
			expectTypeOf(createLogoElement).parameter(0).toMatchTypeOf<Theme>();
		});
	});

	describe("createWidgetSkeletonElement types", () => {
		test("createWidgetSkeletonElement return type", () => {
			const skeleton = createWidgetSkeletonElement(lightTheme);
			expectTypeOf(skeleton).toMatchTypeOf<HTMLElement>();
			expectTypeOf(skeleton).not.toBeAny();
		});

		test("createWidgetSkeletonElement accepts Theme", () => {
			expectTypeOf(createWidgetSkeletonElement)
				.parameter(0)
				.toMatchTypeOf<Theme>();
		});
	});

	describe("createWebComponent types", () => {
		test("createWebComponent return type", () => {
			const component = createWebComponent("test-widget");
			expectTypeOf(component).toMatchTypeOf<HTMLElement>();
			expectTypeOf(component).not.toBeAny();
		});

		test("createWebComponent accepts string as webComponentTag", () => {
			expectTypeOf(createWebComponent).parameter(0).toMatchTypeOf<string>();
		});

		test("createWebComponent accepts optional string as customCss", () => {
			expectTypeOf(createWebComponent)
				.parameter(1)
				.toMatchTypeOf<string | undefined>();
		});

		test("createWebComponent with customCss", () => {
			const component = createWebComponent(
				"test-widget",
				".custom { color: red; }",
			);
			expectTypeOf(component).toMatchTypeOf<HTMLElement>();
		});
	});

	describe("constants types", () => {
		test("WIDGET_URL type", () => {
			expectTypeOf<typeof WIDGET_URL>().toMatchTypeOf<string>();
			expectTypeOf<typeof WIDGET_URL>().not.toBeAny();
		});

		test("WIDGET_URL_TEXT type", () => {
			expectTypeOf<typeof WIDGET_URL_TEXT>().toMatchTypeOf<string>();
			expectTypeOf<typeof WIDGET_URL_TEXT>().not.toBeAny();
		});

		test("WIDGET_INNER_HEIGHT type", () => {
			expectTypeOf<typeof WIDGET_INNER_HEIGHT>().toMatchTypeOf<number>();
			expectTypeOf<typeof WIDGET_INNER_HEIGHT>().not.toBeAny();
		});

		test("WIDGET_OUTER_HEIGHT type", () => {
			expectTypeOf<typeof WIDGET_OUTER_HEIGHT>().toMatchTypeOf<number>();
			expectTypeOf<typeof WIDGET_OUTER_HEIGHT>().not.toBeAny();
		});

		test("WIDGET_MIN_HEIGHT type", () => {
			expectTypeOf<typeof WIDGET_MIN_HEIGHT>().toMatchTypeOf<string>();
			expectTypeOf<typeof WIDGET_MIN_HEIGHT>().not.toBeAny();
		});

		test("WIDGET_MAX_WIDTH type", () => {
			expectTypeOf<typeof WIDGET_MAX_WIDTH>().toMatchTypeOf<string>();
			expectTypeOf<typeof WIDGET_MAX_WIDTH>().not.toBeAny();
		});

		test("WIDGET_DIMENSIONS type", () => {
			expectTypeOf<typeof WIDGET_DIMENSIONS>().toMatchTypeOf<{
				maxWidth: string;
				minHeight: string;
			}>();
			expectTypeOf<typeof WIDGET_DIMENSIONS>().not.toBeAny();
		});

		test("WIDGET_BORDER_RADIUS type", () => {
			expectTypeOf<typeof WIDGET_BORDER_RADIUS>().toMatchTypeOf<string>();
			expectTypeOf<typeof WIDGET_BORDER_RADIUS>().not.toBeAny();
		});

		test("WIDGET_PADDING type", () => {
			expectTypeOf<typeof WIDGET_PADDING>().toMatchTypeOf<string>();
			expectTypeOf<typeof WIDGET_PADDING>().not.toBeAny();
		});

		test("WIDGET_BORDER type", () => {
			expectTypeOf<typeof WIDGET_BORDER>().toMatchTypeOf<string>();
			expectTypeOf<typeof WIDGET_BORDER>().not.toBeAny();
		});

		test("WIDGET_CHECKBOX_SPINNER_CSS_CLASS type", () => {
			expectTypeOf<
				typeof WIDGET_CHECKBOX_SPINNER_CSS_CLASS
			>().toMatchTypeOf<string>();
			expectTypeOf<typeof WIDGET_CHECKBOX_SPINNER_CSS_CLASS>().not.toBeAny();
		});
	});

	describe("function parameter types", () => {
		test("createWidgetSkeleton requires all parameters", () => {
			const container = document.createElement("div");
			createWidgetSkeleton(container, lightTheme, "test-widget");
		});

		test("createCheckboxElement requires Theme parameter", () => {
			createCheckboxElement(lightTheme);
		});

		test("createLogoElement requires Theme parameter", () => {
			createLogoElement(lightTheme);
		});

		test("createWidgetSkeletonElement requires Theme parameter", () => {
			createWidgetSkeletonElement(lightTheme);
		});

		test("createWebComponent requires webComponentTag parameter", () => {
			createWebComponent("test-widget");
		});

		test("getCheckboxInteractiveArea requires HTMLElement parameter", () => {
			const element = document.createElement("div");
			getCheckboxInteractiveArea(element);
		});
	});

	describe("type compatibility", () => {
		test("Theme union type works correctly", () => {
			const themes: Theme[] = [lightTheme, darkTheme];
			expectTypeOf(themes).toMatchTypeOf<Theme[]>();
		});

		test("createWidgetSkeleton accepts both theme types", () => {
			const container = document.createElement("div");
			const result1 = createWidgetSkeleton(container, lightTheme, "widget-1");
			const result2 = createWidgetSkeleton(container, darkTheme, "widget-2");

			expectTypeOf(result1).toMatchTypeOf<{
				widgetInteractiveArea: HTMLElement;
				webComponent: HTMLElement;
			}>();
			expectTypeOf(result2).toMatchTypeOf<{
				widgetInteractiveArea: HTMLElement;
				webComponent: HTMLElement;
			}>();
		});

		test("element creation functions accept both theme types", () => {
			const checkbox1 = createCheckboxElement(lightTheme);
			const checkbox2 = createCheckboxElement(darkTheme);
			const logo1 = createLogoElement(lightTheme);
			const logo2 = createLogoElement(darkTheme);
			const skeleton1 = createWidgetSkeletonElement(lightTheme);
			const skeleton2 = createWidgetSkeletonElement(darkTheme);

			expectTypeOf(checkbox1).toMatchTypeOf<HTMLElement>();
			expectTypeOf(checkbox2).toMatchTypeOf<HTMLElement>();
			expectTypeOf(logo1).toMatchTypeOf<HTMLElement>();
			expectTypeOf(logo2).toMatchTypeOf<HTMLElement>();
			expectTypeOf(skeleton1).toMatchTypeOf<HTMLElement>();
			expectTypeOf(skeleton2).toMatchTypeOf<HTMLElement>();
		});
	});
});
