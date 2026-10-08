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

describe("the pinned tooltip", () => {
	test("shows without a hover, for a touch screen that has none", () => {
		vi.stubGlobal("matchMedia", (query: string) => ({
			matches: "(hover: hover)" !== query,
			media: query,
		}));
		render({ tooltipPinned: true });
		expect(tooltip().style.display).toBe("block");
		expect(tooltip().textContent).toBe(LABEL);
	});

	test("stays up when the pointer leaves", () => {
		const element = render({ tooltipPinned: true });
		fire(element, "mouseenter");
		fire(element, "mouseleave");
		expect(tooltip().style.display).toBe("block");
	});

	test("goes once it is unpinned", () => {
		render({ tooltipPinned: true });
		render({ tooltipPinned: false });
		expect(tooltip().style.display).toBe("none");
	});

	test("puts the button on the theme's primary colour", () => {
		expect(render({ tooltipPinned: true }).style.backgroundColor).toBe(
			asRgb(lightTheme.palette.primary.main),
		);
	});

	test("asks for the switch when pressed", () => {
		fire(render({ tooltipPinned: true }), "click");
		expect(onSwitch).toHaveBeenCalledTimes(1);
	});
});
