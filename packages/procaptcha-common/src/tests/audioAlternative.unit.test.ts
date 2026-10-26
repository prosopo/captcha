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

import { darkTheme, lightTheme } from "@prosopo/widget-skeleton";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
	type AudioAlternativeButtonProps,
	type AudioAlternativeFooterProps,
	audioAlternativeOffer,
	mountAudioAlternativeButton,
	mountAudioAlternativeFooter,
} from "../components/audioAlternative.js";
import type { Component } from "../dom/component.js";
import {
	type Mounted,
	asRgb,
	fire,
	fireAndReturn,
	mount,
} from "./domHarness.js";

const CONTROL_SELECTOR = '[data-cy="prosopo-audio-alternative"]';
const LABEL = "Use audio instead";

let mounted: Mounted;
let control: Component<AudioAlternativeButtonProps> | undefined;
const onRequestAudio = vi.fn<() => void>();

const render = (
	overrides: Partial<AudioAlternativeButtonProps> = {},
): HTMLButtonElement => {
	const props: AudioAlternativeButtonProps = {
		theme: lightTheme,
		onRequestAudio,
		label: LABEL,
		...overrides,
	};
	if (control) {
		control.update(props);
	} else {
		control = mountAudioAlternativeButton(mounted.container, props);
	}
	const element =
		mounted.container.querySelector<HTMLButtonElement>(CONTROL_SELECTOR);
	if (!element) throw new Error("expected an audio alternative control");
	return element;
};

beforeEach(() => {
	vi.clearAllMocks();
	mounted = mount();
	control = undefined;
});

afterEach(() => {
	control?.destroy();
	mounted.unmount();
	vi.unstubAllGlobals();
});

describe("what the control renders", () => {
	test("is a real button that will not submit the dapp's form", () => {
		const element = render();
		expect(element.tagName).toBe("BUTTON");
		expect(element.getAttribute("type")).toBe("button");
	});

	test("names itself with its visible text", () => {
		expect(render().textContent).toBe(LABEL);
	});

	test("relabels in place when the translation arrives", () => {
		render({ label: "" });
		expect(render({ label: LABEL }).textContent).toBe(LABEL);
	});

	test("withholds the test hook from a production build", () => {
		const originalNodeEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = "production";
		try {
			control = mountAudioAlternativeButton(mounted.container, {
				theme: lightTheme,
				onRequestAudio,
				label: LABEL,
			});
			expect(mounted.container.querySelector(CONTROL_SELECTOR)).toBeNull();
			expect(mounted.container.querySelector("button")).not.toBeNull();
		} finally {
			if (undefined === originalNodeEnv) {
				Reflect.deleteProperty(process.env, "NODE_ENV");
			} else {
				process.env.NODE_ENV = originalNodeEnv;
			}
		}
	});
});

describe("theming", () => {
	test("uses the light theme's primary colour for its text", () => {
		expect(render().style.color).toBe(asRgb(lightTheme.palette.primary.main));
	});

	test("uses the dark theme's primary colour in dark mode", () => {
		expect(render({ theme: darkTheme }).style.color).toBe(
			asRgb(darkTheme.palette.primary.main),
		);
	});

	test("hover fills the state layer and leaving clears it", () => {
		const element = render();
		fire(element, "mouseenter");
		expect(element.style.backgroundColor).toBe(
			asRgb(lightTheme.palette.primaryContainer.hover),
		);
		fire(element, "mouseleave");
		expect(element.style.backgroundColor).toBe("transparent");
	});

	test("a touch screen gets no state layer", () => {
		vi.stubGlobal("matchMedia", (query: string) => ({
			matches: "(hover: hover)" !== query,
			media: query,
		}));
		const element = render();
		fire(element, "mouseenter");
		expect(element.style.backgroundColor).toBe("transparent");
	});

	test("shows no focus ring at rest, nor after blur", () => {
		const element = render();
		expect(element.style.outline).toBe("none");
		fire(element, "focus");
		fire(element, "blur");
		expect(element.style.outline).toBe("none");
	});
});

describe("activating", () => {
	test("asks for the audio alternative", () => {
		fire(render(), "click");
		expect(onRequestAudio).toHaveBeenCalledTimes(1);
	});

	test("does not submit the surrounding form", () => {
		expect(fireAndReturn(render(), "click").defaultPrevented).toBe(true);
	});

	test("ignores a click no user made", () => {
		fire(render(), "click", { trusted: false });
		expect(onRequestAudio).not.toHaveBeenCalled();
	});

	test("calls the handler the latest props carry", () => {
		const element = render();
		const replacement = vi.fn<() => void>();
		render({ onRequestAudio: replacement });
		fire(element, "click");
		expect(replacement).toHaveBeenCalledTimes(1);
		expect(onRequestAudio).not.toHaveBeenCalled();
	});
});

describe("tearing down", () => {
	test("removes itself and stops listening", () => {
		const element = render();
		control?.destroy();
		control = undefined;
		expect(mounted.container.querySelector(CONTROL_SELECTOR)).toBeNull();
		fire(element, "click");
		expect(onRequestAudio).not.toHaveBeenCalled();
	});
});

describe("audioAlternativeOffer", () => {
	test("is absent when the site has not turned audio on", () => {
		expect(
			audioAlternativeOffer(
				{ onRequestAudioAlternative: onRequestAudio },
				LABEL,
			),
		).toBeUndefined();
	});

	test("is absent when nothing would handle the request", () => {
		expect(
			audioAlternativeOffer({ audioAlternativeAvailable: true }, LABEL),
		).toBeUndefined();
	});

	test("carries the handler and label when the site offers audio", () => {
		expect(
			audioAlternativeOffer(
				{
					audioAlternativeAvailable: true,
					onRequestAudioAlternative: onRequestAudio,
				},
				LABEL,
			),
		).toEqual({ onRequestAudio, label: LABEL });
	});
});

describe("the footer a canvas challenge carries it in", () => {
	let footer: Component<AudioAlternativeFooterProps> | undefined;

	const footerProps = (
		overrides: Partial<AudioAlternativeFooterProps> = {},
	): AudioAlternativeFooterProps => ({
		offer: { onRequestAudio, label: LABEL },
		theme: lightTheme,
		width: 300,
		...overrides,
	});

	const strip = (): HTMLElement => {
		const element = mounted.container.firstElementChild;
		if (!(element instanceof HTMLElement)) {
			throw new Error("expected the footer to be rendered");
		}
		return element;
	};

	afterEach(() => {
		footer?.destroy();
		footer = undefined;
	});

	test("renders the control at the panel's width, on its surface", () => {
		footer = mountAudioAlternativeFooter(mounted.container, footerProps());
		expect(mounted.container.querySelector(CONTROL_SELECTOR)).not.toBeNull();
		expect(strip().style.width).toBe("300px");
		expect(strip().style.backgroundColor).toBe(
			asRgb(lightTheme.palette.surface),
		);
	});

	test("is hidden, with no control in it, when nothing is offered", () => {
		footer = mountAudioAlternativeFooter(
			mounted.container,
			footerProps({ offer: undefined }),
		);
		expect(strip().style.display).toBe("none");
		expect(mounted.container.querySelector(CONTROL_SELECTOR)).toBeNull();
	});

	test("follows the offer as it comes and goes", () => {
		footer = mountAudioAlternativeFooter(
			mounted.container,
			footerProps({ offer: undefined }),
		);
		footer.update(footerProps());
		expect(strip().style.display).toBe("");
		expect(mounted.container.querySelector(CONTROL_SELECTOR)).not.toBeNull();
		footer.update(footerProps({ offer: undefined }));
		expect(mounted.container.querySelector(CONTROL_SELECTOR)).toBeNull();
	});

	test("themes the control from the canvas theme's mode", () => {
		footer = mountAudioAlternativeFooter(
			mounted.container,
			footerProps({ theme: darkTheme }),
		);
		expect(
			mounted.container.querySelector<HTMLElement>(CONTROL_SELECTOR)?.style
				.color,
		).toBe(asRgb(darkTheme.palette.primary.main));
	});

	test("removes itself when destroyed", () => {
		footer = mountAudioAlternativeFooter(mounted.container, footerProps());
		footer.destroy();
		footer = undefined;
		expect(mounted.container.childElementCount).toBe(0);
	});
});
