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

/**
 * What the surface actually puts on the page for each placement.
 *
 * The geometry is covered separately; these are about the properties that make
 * a placement what it is — whether the page stays usable behind the challenge,
 * whether an outside click dismisses it, and whether a float request without
 * an anchor quietly becomes a popup rather than a panel in the corner.
 */

// jsdom has no PointerEvent, and the dismiss handler only reads event.target,
// so these dispatch a plain Event of the same type.
import { type Root, createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChallengeSurface } from "../reactComponents/ChallengeSurface.js";

let container: HTMLDivElement;
let root: Root;
let anchor: HTMLDivElement;

const layer = (): HTMLElement | null =>
	document.querySelector<HTMLElement>(".prosopo-challenge-surface");

const content = (): HTMLElement | null =>
	document.querySelector<HTMLElement>(".prosopo-challenge-content");

interface RenderArgs {
	placement?: "popup" | "float";
	withAnchor?: boolean;
	onDismiss?: () => void;
	show?: boolean;
}

const render = ({
	placement,
	withAnchor = true,
	onDismiss,
	show = true,
}: RenderArgs): void => {
	act(() => {
		root.render(
			<ChallengeSurface
				show={show}
				placement={placement}
				anchor={withAnchor ? anchor : null}
				onDismiss={onDismiss}
			>
				<div data-testid="challenge">challenge</div>
			</ChallengeSurface>,
		);
	});
};

beforeEach(() => {
	container = document.createElement("div");
	anchor = document.createElement("div");
	document.body.append(container, anchor);
	root = createRoot(container);
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
	anchor.remove();
});

describe("where the surface renders", () => {
	it("portals out of the mount container to the body", () => {
		// A challenge left in the widget's own flow is clipped by any host page
		// that wraps the widget in overflow: hidden.
		render({});

		expect(container.querySelector(".prosopo-challenge-surface")).toBeNull();
		expect(layer()?.parentElement).toBe(document.body);
	});

	it("hides rather than unmounts when not shown", () => {
		// Children keep their state, so reopening does not re-fetch a challenge.
		render({ show: false });

		expect(layer()?.style.display).toBe("none");
		expect(layer()?.textContent).toContain("challenge");
	});
});

describe("popup", () => {
	it("is the default placement", () => {
		render({});

		expect(layer()?.className).toContain("prosopo-challenge-surface--popup");
	});

	it("covers the page, so nothing behind it is reachable", () => {
		render({ placement: "popup" });

		expect(layer()?.style.display).toBe("flex");
		// No pointer-events opt-out: the layer itself is the barrier.
		expect(layer()?.style.pointerEvents).toBe("");
	});

	it("ignores an outside click", () => {
		const onDismiss = vi.fn();
		render({ placement: "popup", onDismiss });

		act(() => {
			document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
		});

		expect(onDismiss).not.toHaveBeenCalled();
	});
});

describe("float", () => {
	it("leaves the page usable behind it", () => {
		render({ placement: "float" });

		expect(layer()?.className).toContain("prosopo-challenge-surface--float");
		// The layer spans the viewport for positioning but must not swallow
		// clicks — that is the whole difference from a popup.
		expect(layer()?.style.pointerEvents).toBe("none");
		expect(content()?.style.pointerEvents).toBe("auto");
	});

	it("dismisses on a click outside the panel", () => {
		const onDismiss = vi.fn();
		render({ placement: "float", onDismiss });

		act(() => {
			document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
		});

		expect(onDismiss).toHaveBeenCalledTimes(1);
	});

	it("does not dismiss on a click inside the panel", () => {
		const onDismiss = vi.fn();
		render({ placement: "float", onDismiss });

		act(() => {
			content()?.dispatchEvent(new Event("pointerdown", { bubbles: true }));
		});

		expect(onDismiss).not.toHaveBeenCalled();
	});

	it("does not dismiss on a click on the anchor", () => {
		// Clicking the widget is what opened the panel; treating it as an
		// outside click would close and immediately reopen it.
		const onDismiss = vi.fn();
		render({ placement: "float", onDismiss });

		act(() => {
			anchor.dispatchEvent(new Event("pointerdown", { bubbles: true }));
		});

		expect(onDismiss).not.toHaveBeenCalled();
	});

	it("falls back to popup with no anchor to attach to", () => {
		// This is the invisible-widget case: nothing on the page to point at.
		render({ placement: "float", withAnchor: false });

		expect(layer()?.className).toContain("prosopo-challenge-surface--popup");
		expect(layer()?.style.pointerEvents).toBe("");
	});
});

describe("dismissing with the keyboard", () => {
	it("closes on Escape in either placement", () => {
		for (const placement of ["popup", "float"] as const) {
			const onDismiss = vi.fn();
			render({ placement, onDismiss });

			act(() => {
				document.dispatchEvent(
					new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
				);
			});

			expect(
				onDismiss,
				`${placement} should close on Escape`,
			).toHaveBeenCalled();
		}
	});

	it("ignores other keys", () => {
		const onDismiss = vi.fn();
		render({ placement: "float", onDismiss });

		act(() => {
			document.dispatchEvent(
				new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
			);
		});

		expect(onDismiss).not.toHaveBeenCalled();
	});
});
