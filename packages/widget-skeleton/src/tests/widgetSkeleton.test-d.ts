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
import { getCheckboxInteractiveArea } from "../elements/checkbox.js";
import {
	type EnvironmentSources,
	getCurrentEnvironmentMode,
	isDevMode,
	replacePlaceholder,
} from "../elements/skeleton.js";
// The package entrypoint: this is the surface consumers actually see.
import {
	type Theme,
	WIDGET_DIMENSIONS,
	WIDGET_INNER_HEIGHT,
	WIDGET_OUTER_HEIGHT,
	WIDGET_URL,
	createWidgetSkeleton,
	darkTheme,
	lightTheme,
} from "../index.js";
import { createWebComponent } from "../webComponent/createWebComponent.js";

describe("createWidgetSkeleton", () => {
	test("accepts any Element as the container", () => {
		// Callers pass the result of a querySelector, which is Element, not
		// HTMLElement — narrowing this would force a cast at every call site.
		expectTypeOf(createWidgetSkeleton).parameter(0).toEqualTypeOf<Element>();
		assertType<Element>(document.createElement("div"));
	});

	test("returns both the mount point and the click target", () => {
		expectTypeOf(createWidgetSkeleton).returns.toEqualTypeOf<{
			widgetInteractiveArea: HTMLElement;
			webComponent: HTMLElement;
		}>();
	});

	test("the interactive area is non-nullable, unlike the lookup behind it", () => {
		// The function throws instead of propagating the null, so callers do not
		// have to check.
		expectTypeOf(
			createWidgetSkeleton(document.createElement("div"), lightTheme, "x")
				.widgetInteractiveArea,
		).not.toBeNullable();
		expectTypeOf(
			getCheckboxInteractiveArea,
		).returns.toEqualTypeOf<HTMLElement | null>();
	});

	test("the tag is a plain string", () => {
		expectTypeOf(createWidgetSkeleton).parameter(2).toEqualTypeOf<string>();
	});

	test("rejects a missing tag", () => {
		// @ts-expect-error the web component tag is required
		createWidgetSkeleton(document.createElement("div"), lightTheme);
	});

	test("rejects an object that is not a theme", () => {
		// @ts-expect-error a partial palette is not a Theme
		createWidgetSkeleton(document.createElement("div"), { palette: {} }, "x");
	});
});

describe("Theme", () => {
	test("is the union of the two shipped themes", () => {
		// Consumers pick between them by a runtime string, so both must satisfy
		// the type the API asks for.
		assertType<Theme>(lightTheme);
		assertType<Theme>(darkTheme);
	});

	test("exposes the fields interpolated into the stylesheets", () => {
		expectTypeOf<
			Theme["palette"]["background"]["default"]
		>().toEqualTypeOf<string>();
		expectTypeOf<Theme["palette"]["logoFill"]>().toEqualTypeOf<string>();
		expectTypeOf<Theme["font"]["fontFamily"]>().toEqualTypeOf<string>();
		expectTypeOf<Theme["spacing"]["unit"]>().toEqualTypeOf<number>();
	});

	test("the grey ramp is indexed by its step numbers", () => {
		expectTypeOf<Theme["palette"]["grey"][900]>().toEqualTypeOf<string>();
		// @ts-expect-error 950 is not a step on the ramp
		expectTypeOf<Theme["palette"]["grey"][950]>();
	});

	test("mode is widened to string, so it cannot be used to discriminate", () => {
		// Documents the current shape: it is inferred from an object literal
		// without `as const`, so `theme.palette.mode === "dark"` narrows nothing.
		expectTypeOf<Theme["palette"]["mode"]>().toEqualTypeOf<string>();
	});
});

describe("constants", () => {
	test("heights are numbers and css lengths are strings", () => {
		// The heights are arithmetic inputs; mixing the two up produces a
		// stylesheet reading "80pxpx".
		expectTypeOf(WIDGET_OUTER_HEIGHT).toEqualTypeOf<number>();
		expectTypeOf(WIDGET_INNER_HEIGHT).toEqualTypeOf<number>();
		expectTypeOf(WIDGET_URL).toEqualTypeOf<string>();
	});

	test("the shared dimensions are a css style fragment", () => {
		expectTypeOf(WIDGET_DIMENSIONS).toEqualTypeOf<{
			maxWidth: string;
			minHeight: string;
		}>();
	});
});

describe("environment detection", () => {
	test("both sources are optional strings", () => {
		expectTypeOf<EnvironmentSources>().toEqualTypeOf<{
			nodeEnv: string | undefined;
			bundlerMode: string | undefined;
		}>();
	});

	test("the sources may be injected or defaulted", () => {
		assertType<boolean>(isDevMode());
		assertType<boolean>(
			isDevMode({ nodeEnv: "production", bundlerMode: undefined }),
		);
		assertType<string | undefined>(getCurrentEnvironmentMode());
	});

	test("rejects a partial source set", () => {
		// @ts-expect-error bundlerMode must be stated, even as undefined
		isDevMode({ nodeEnv: "production" });
	});
});

describe("web component helpers", () => {
	test("createWebComponent's custom css is optional", () => {
		assertType<HTMLElement>(createWebComponent("x"));
		assertType<HTMLElement>(createWebComponent("x", ".a{}"));
	});

	test("replacePlaceholder returns nothing — it mutates the tree", () => {
		expectTypeOf(replacePlaceholder).returns.toEqualTypeOf<void>();
		expectTypeOf(replacePlaceholder).parameter(2).toEqualTypeOf<HTMLElement>();
	});
});

describe("package entrypoint", () => {
	test("does not re-export the internal element builders", () => {
		// Keeping them off the entrypoint is what allows their signatures to
		// change without a breaking release.
		expectTypeOf<typeof import("../index.js")>().not.toHaveProperty(
			"createWidgetSkeletonElement",
		);
		expectTypeOf<typeof import("../index.js")>().not.toHaveProperty(
			"createWebComponent",
		);
	});
});
