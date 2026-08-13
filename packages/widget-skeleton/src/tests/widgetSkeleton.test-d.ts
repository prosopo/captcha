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

import { assertType, describe, expectTypeOf, test } from "vitest";
import { createCheckboxElement } from "../elements/checkbox.js";
import {
	WIDGET_DIMENSIONS,
	createWidgetSkeleton,
	lightTheme,
} from "../index.js";
import type { Theme } from "../theme.js";
import { createWebComponent } from "../webComponent/createWebComponent.js";

describe("the Theme contract", () => {
	test("either theme satisfies it", () => {
		expectTypeOf(lightTheme).toMatchTypeOf<Theme>();
	});

	test("is what every element factory asks for", () => {
		expectTypeOf(createCheckboxElement).parameter(0).toEqualTypeOf<Theme>();
	});

	test("rejects a partial theme", () => {
		// @ts-expect-error a theme missing its palette is not a Theme
		assertType<Theme>({ spacing: { unit: 10, half: 5 } });
	});

	test("exposes its M3 surface roles as plain colour strings", () => {
		expectTypeOf(
			lightTheme.palette.surfaceContainerHigh,
		).toEqualTypeOf<string>();
		expectTypeOf(lightTheme.palette.onSurfaceVariant).toEqualTypeOf<string>();
	});

	test("reports spacing in numbers so consumers can do arithmetic", () => {
		expectTypeOf(lightTheme.spacing.unit).toEqualTypeOf<number>();
		expectTypeOf(lightTheme.spacing.half).toEqualTypeOf<number>();
	});
});

describe("attaching a skeleton", () => {
	test("takes any Element as its container, not just an HTMLElement", () => {
		// Consumers hand over whatever querySelector returned.
		expectTypeOf(createWidgetSkeleton).parameter(0).toEqualTypeOf<Element>();
	});

	test("names the custom element with a plain string", () => {
		expectTypeOf(createWidgetSkeleton).parameter(2).toEqualTypeOf<string>();
	});

	test("returns both halves as non-nullable elements", () => {
		expectTypeOf(createWidgetSkeleton).returns.toEqualTypeOf<{
			widgetInteractiveArea: HTMLElement;
			webComponent: HTMLElement;
		}>();
	});

	test("cannot be called without a tag name", () => {
		// @ts-expect-error the web component tag is required
		assertType(createWidgetSkeleton(document.createElement("div"), lightTheme));
	});
});

describe("the web component factory", () => {
	test("returns an HTMLElement rather than the shadow root", () => {
		expectTypeOf(createWebComponent).returns.toEqualTypeOf<HTMLElement>();
	});

	test("treats the custom css as optional", () => {
		assertType(createWebComponent("prosopo-widget"));
	});
});

describe("the published dimensions", () => {
	test("are strings, ready to interpolate into css", () => {
		expectTypeOf(WIDGET_DIMENSIONS.maxWidth).toEqualTypeOf<string>();
		expectTypeOf(WIDGET_DIMENSIONS.minHeight).toEqualTypeOf<string>();
	});
});
