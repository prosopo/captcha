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

import { lightTheme } from "@prosopo/widget-skeleton";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { CheckboxProps } from "../components/checkbox.js";
import { mountReloadButton } from "../components/reload.js";
import type { Component } from "../dom/component.js";
import { type Mounted, mount } from "./domHarness.js";

let mounted: Mounted;
let component: { destroy: () => void } | undefined;

beforeEach(() => {
	mounted = mount();
	component = undefined;
});

afterEach(() => {
	component?.destroy();
	mounted.unmount();
	vi.unstubAllEnvs();
	vi.resetModules();
});

const faqHref = async (docsUrl: string): Promise<string | null> => {
	vi.stubEnv("PROSOPO_DOCS_URL", docsUrl);
	vi.resetModules();
	const { mountCheckbox } = await import("../components/checkbox.js");
	const checkbox: Component<CheckboxProps> = mountCheckbox(mounted.container, {
		theme: lightTheme,
		checked: false,
		onChange: () => undefined,
		labelText: "I am human",
		loading: false,
		error: "Cannot load CAPTCHA",
	});
	component = checkbox;
	return (
		mounted.container
			.querySelector<HTMLAnchorElement>("a[href]")
			?.getAttribute("href") ?? null
	);
};

describe("error FAQ link", () => {
	test.each([
		"https://docs.example.com",
		"https://docs.example.com/",
		"https://docs.example.com//",
	])("points at one FAQ page for PROSOPO_DOCS_URL=%s", async (docsUrl) => {
		expect(await faqHref(docsUrl)).toBe(
			"https://docs.example.com/en/basics/faq/",
		);
	});
});

describe("reload button", () => {
	test("is announced by the label it is given", () => {
		const reload = mountReloadButton(mounted.container, {
			themeColor: "light",
			onReload: () => undefined,
			label: "Neu laden",
		});
		component = reload;
		const control = mounted.container.querySelector("[aria-label]");
		expect(control?.getAttribute("aria-label")).toBe("Neu laden");
	});
});
