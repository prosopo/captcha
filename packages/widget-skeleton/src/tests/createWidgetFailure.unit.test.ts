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

import { describe, expect, test, vi } from "vitest";
import type { Theme } from "../theme.js";

// A checkbox that carries the class the lookup keys on but none of the content
// inside it. This is what a future edit to CHECKBOX_MARKUP would produce, and
// it is the only way createWidgetSkeleton's guard can fire.
vi.mock("../elements/checkbox.js", async (importOriginal) => {
	const original =
		await importOriginal<typeof import("../elements/checkbox.js")>();
	return {
		...original,
		createCheckboxElement: (_theme: Theme): HTMLElement => {
			const checkbox: HTMLElement = document.createElement("div");
			checkbox.className = "prosopo-checkbox";
			return checkbox;
		},
	};
});

const { createWidgetSkeleton } = await import(
	"../webComponent/createWidget.js"
);
const { lightTheme } = await import("../theme.js");

describe("createWidgetSkeleton without an interactive area", () => {
	test("throws rather than returning a widget nothing can click", () => {
		// The caller binds its verification flow to the returned element, so a
		// null here would surface much later as an inert widget.
		expect(() =>
			createWidgetSkeleton(
				document.createElement("div"),
				lightTheme,
				"procaptcha-broken",
			),
		).toThrow("interactive area is not found");
	});

	test("still leaves the rendered widget in the container", () => {
		// Documents that the failure is not atomic: the container was already
		// cleared and the host appended before the guard ran.
		const container: HTMLElement = document.createElement("div");
		container.innerHTML = "<p>previous contents</p>";
		expect(() =>
			createWidgetSkeleton(container, lightTheme, "procaptcha-broken"),
		).toThrow();
		expect(container.querySelector("p")).toBeNull();
		expect(container.children.length).toBe(1);
	});
});
