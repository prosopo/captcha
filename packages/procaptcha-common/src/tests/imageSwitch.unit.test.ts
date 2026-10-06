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
import {
	type ImageSwitchButtonProps,
	mountImageSwitchButton,
} from "../components/imageSwitch.js";
import type { Component } from "../dom/component.js";
import { type Mounted, asRgb, fire, mount } from "./domHarness.js";

const LABEL = "Switch to an image challenge";
const LABELLED_TEXT = "Try an image challenge instead";
const CONTROL_SELECTOR = '[data-cy="image-switch-button"]';

let mounted: Mounted;
let button: Component<ImageSwitchButtonProps> | undefined;
const onSwitch = vi.fn<() => void>();

const render = (
	overrides: Partial<ImageSwitchButtonProps> = {},
): HTMLElement => {
	const props: ImageSwitchButtonProps = {
		themeColor: "light",
		onSwitch,
		label: LABEL,
		labelledText: LABELLED_TEXT,
		...overrides,
	};
	if (button) {
		button.update(props);
	} else {
		button = mountImageSwitchButton(mounted.container, props);
	}
	const element =
		mounted.container.querySelector<HTMLElement>(CONTROL_SELECTOR);
	if (!element) throw new Error("expected a switch control to be rendered");
	return element;
};

const tooltip = (): HTMLElement => {
	const element =
		mounted.container.querySelector<HTMLElement>('[role="tooltip"]');
	if (!element) throw new Error("expected a tooltip to be rendered");
	return element;
};

beforeEach(() => {
	vi.clearAllMocks();
	mounted = mount();
	button = undefined;
});

afterEach(() => {
	button?.destroy();
	mounted.unmount();
	vi.unstubAllGlobals();
});

describe("the icon variant", () => {
	test("names what it does for assistive tech", () => {
		expect(render().getAttribute("aria-label")).toBe(LABEL);
	});

	test("draws no text beside the icon", () => {
		expect(render().textContent).toBe("");
	});

	test("explains itself in a tooltip on hover", () => {
		const element = render();
		expect(tooltip().style.display).toBe("none");
		fire(element, "mouseenter");
		expect(tooltip().style.display).toBe("block");
		expect(tooltip().textContent).toBe(LABEL);
		fire(element, "mouseleave");
		expect(tooltip().style.display).toBe("none");
	});

	test("draws no tooltip a touch screen would have to tap through", () => {
		vi.stubGlobal("matchMedia", (query: string) => ({
			matches: "(hover: hover)" !== query,
			media: query,
		}));
		fire(render(), "mouseenter");
		expect(tooltip().style.display).toBe("none");
	});

	test("asks for the switch when pressed", () => {
		fire(render(), "click");
		expect(onSwitch).toHaveBeenCalledTimes(1);
	});
});

describe("the labelled variant", () => {
	test("says what it does in words", () => {
		expect(render({ labelled: true }).textContent).toBe(LABELLED_TEXT);
	});

	test("stands out on the theme's primary colour", () => {
		expect(render({ labelled: true }).style.backgroundColor).toBe(
			asRgb(lightTheme.palette.primary.main),
		);
	});

	test("needs no tooltip", () => {
		fire(render({ labelled: true }), "mouseenter");
		expect(tooltip().style.display).toBe("none");
	});

	test("asks for the switch when pressed", () => {
		fire(render({ labelled: true }), "click");
		expect(onSwitch).toHaveBeenCalledTimes(1);
	});
});
