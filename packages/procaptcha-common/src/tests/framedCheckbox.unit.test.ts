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

import { InputMethod } from "@prosopo/types";
import { darkTheme, lightTheme } from "@prosopo/widget-skeleton";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { CheckboxProps } from "../components/checkbox.js";
import {
	type CheckboxFrameMessage,
	FRAME_READY_TIMEOUT_MS,
	mountFramedCheckbox,
} from "../components/framedCheckbox.js";
import type { Component } from "../dom/component.js";
import { type Mounted, mount } from "./domHarness.js";

const FRAME_URL = new URL("https://js.example.test/js/checkbox-frame.html");

let mounted: Mounted;
let checkbox: Component<CheckboxProps> | undefined;
const onChange = vi.fn<CheckboxProps["onChange"]>();

const props = (overrides: Partial<CheckboxProps> = {}): CheckboxProps => ({
	theme: lightTheme,
	checked: false,
	onChange,
	labelText: "I am human",
	loading: false,
	...overrides,
});

const frame = (): HTMLIFrameElement => {
	const element = mounted.container.querySelector("iframe");
	if (!element) throw new Error("expected the checkbox frame");
	return element;
};

const nonce = (): string => new URL(frame().src).hash.replace("#n=", "");

/** Delivers a message to the page as if the frame had posted it. */
const fromFrame = (
	data: Partial<CheckboxFrameMessage> & { t: string },
	overrides: { origin?: string; source?: MessageEventSource | null } = {},
): void => {
	window.dispatchEvent(
		new MessageEvent("message", {
			data: { pf: nonce(), ...data },
			origin: overrides.origin ?? FRAME_URL.origin,
			source:
				overrides.source === undefined
					? frame().contentWindow
					: overrides.source,
		}),
	);
};

beforeEach(() => {
	vi.useFakeTimers();
	mounted = mount();
	onChange.mockReset();
	checkbox = mountFramedCheckbox(mounted.container, props(), FRAME_URL);
});

afterEach(() => {
	checkbox?.destroy();
	checkbox = undefined;
	mounted.unmount();
	vi.useRealTimers();
});

describe("mounting", () => {
	test("draws the checkbox in the page at once, with the frame loading hidden over it", () => {
		expect(frame().src.startsWith(FRAME_URL.href)).toBe(true);
		expect(nonce()).toMatch(/^[0-9a-f]{32}$/);
		expect(frame().style.opacity).toBe("0");
		expect(frame().style.pointerEvents).toBe("none");
		expect(frame().title).toBe("I am human");
		expect(mounted.container.querySelector("input")).not.toBeNull();
	});

	test("keeps the in-page checkbox while the frame is ready but has not drawn", () => {
		fromFrame({ t: "ready" });
		fromFrame({ t: "size", w: 240, h: 60 });

		expect(frame().style.opacity).toBe("0");
		expect(mounted.container.querySelector("input")).not.toBeNull();
	});

	test("swaps to the frame once it has drawn, and keeps it past the timeout", () => {
		fromFrame({ t: "ready" });
		fromFrame({ t: "drawn" });
		vi.advanceTimersByTime(FRAME_READY_TIMEOUT_MS);

		expect(frame().style.opacity).toBe("1");
		expect(frame().style.pointerEvents).toBe("auto");
		expect(mounted.container.querySelector("input")).toBeNull();
	});

	test("drops the frame and keeps the in-page checkbox when the frame never draws", () => {
		vi.advanceTimersByTime(FRAME_READY_TIMEOUT_MS);

		expect(mounted.container.querySelector("iframe")).toBeNull();
		expect(mounted.container.querySelector("input")).not.toBeNull();
	});
});

describe("talking to the frame", () => {
	test("sends the props without the change handler once ready, and again on update", () => {
		const post = vi.spyOn(frame().contentWindow as Window, "postMessage");
		fromFrame({ t: "ready" });

		expect(post).toHaveBeenCalledTimes(1);
		const [message, origin] = post.mock.calls[0] ?? [];
		expect(origin).toBe(FRAME_URL.origin);
		expect(message).toMatchObject({ pf: nonce(), t: "props" });
		expect(message.props).not.toHaveProperty("onChange");

		checkbox?.update(props({ checked: true, theme: darkTheme }));
		expect(post).toHaveBeenCalledTimes(2);
		expect(post.mock.calls[1]?.[0].props.checked).toBe(true);
		expect(frame().style.colorScheme).toBe("dark");
	});

	test("reports a pointer activation at its position in the page", () => {
		vi.spyOn(frame(), "getBoundingClientRect").mockReturnValue({
			left: 100,
			top: 50,
		} as DOMRect);
		fromFrame({ t: "ready" });
		fromFrame({ t: "drawn" });
		fromFrame({
			t: "activate",
			x: 12,
			y: 30,
			inputMethod: InputMethod.pointer,
		});

		expect(onChange).toHaveBeenCalledWith({
			x: 112,
			y: 80,
			inputMethod: InputMethod.pointer,
		});
	});

	test("keeps a keyboard activation at (0, 0), with no position", () => {
		vi.spyOn(frame(), "getBoundingClientRect").mockReturnValue({
			left: 100,
			top: 50,
		} as DOMRect);
		fromFrame({ t: "ready" });
		fromFrame({ t: "drawn" });
		fromFrame({ t: "activate", x: 0, y: 0, inputMethod: InputMethod.keyboard });

		expect(onChange).toHaveBeenCalledWith({
			x: 0,
			y: 0,
			inputMethod: InputMethod.keyboard,
		});
	});

	test("ignores an activation from a frame that is not shown yet", () => {
		fromFrame({ t: "ready" });
		fromFrame({ t: "activate", x: 1, y: 1, inputMethod: InputMethod.pointer });

		expect(onChange).not.toHaveBeenCalled();
	});

	test("sizes the frame to the checkbox it drew", () => {
		fromFrame({ t: "size", w: 240, h: 60 });

		expect(frame().style.width).toBe("240px");
		expect(frame().style.height).toBe("60px");
	});

	test.each([
		["another window", { source: window }],
		["another origin", { origin: "https://evil.example.test" }],
	])("ignores a message from %s", (_name, overrides) => {
		fromFrame(
			{ t: "activate", x: 1, y: 1, inputMethod: InputMethod.pointer },
			overrides,
		);

		expect(onChange).not.toHaveBeenCalled();
	});

	test("ignores a message without the frame's nonce", () => {
		window.dispatchEvent(
			new MessageEvent("message", {
				data: {
					pf: "wrong",
					t: "activate",
					x: 1,
					y: 1,
					inputMethod: InputMethod.pointer,
				},
				origin: FRAME_URL.origin,
				source: frame().contentWindow,
			}),
		);

		expect(onChange).not.toHaveBeenCalled();
	});
});

describe("tearing down", () => {
	test("removes the frame and stops listening", () => {
		const contentWindow = frame().contentWindow;
		checkbox?.destroy();
		checkbox = undefined;

		expect(mounted.container.querySelector("iframe")).toBeNull();
		window.dispatchEvent(
			new MessageEvent("message", {
				data: { t: "activate", x: 1, y: 1 },
				source: contentWindow,
			}),
		);
		expect(onChange).not.toHaveBeenCalled();
	});
});
