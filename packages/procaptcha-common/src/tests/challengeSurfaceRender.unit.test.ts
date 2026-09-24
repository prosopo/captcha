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

// jsdom has no PointerEvent; the dismiss handler only reads event.target, so
// a plain Event of the same type is dispatched instead.
import { PlacementEnum, type PlacementType } from "@prosopo/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type ChallengeSurfaceComponent,
	mountChallengeSurface,
} from "../components/challengeSurface.js";
import { createElement } from "../dom/element.js";

let surface: ChallengeSurfaceComponent | undefined;
let anchor: HTMLDivElement;

// Both elements are named per mount, so the tests find them by the
// development-only hook and read the placement off the layout it produces
// rather than off a class that says what the layout is meant to be.
const LAYER_SELECTOR = '[data-cy="challenge-surface"]';
const CONTENT_SELECTOR = '[data-cy="challenge-content"]';

const layer = (): HTMLElement | null =>
	document.querySelector<HTMLElement>(LAYER_SELECTOR);

const content = (): HTMLElement | null =>
	document.querySelector<HTMLElement>(CONTENT_SELECTOR);

interface RenderArgs {
	placement?: PlacementType;
	withAnchor?: boolean;
	onDismiss?: () => void;
	show?: boolean;
	dialogLabel?: string;
	focusableChildren?: number;
}

const render = ({
	placement,
	withAnchor = true,
	onDismiss,
	show = true,
	dialogLabel,
	focusableChildren = 0,
}: RenderArgs): void => {
	surface = mountChallengeSurface({
		show,
		placement,
		anchor: withAnchor ? anchor : null,
		onDismiss,
		dialogLabel,
	});

	// The React component took children as a prop; here the caller mounts its
	// own challenge UI into `content` before the surface is shown to it.
	surface.content.appendChild(
		createElement("div", { attributes: { "data-testid": "challenge" } }),
	);
	for (let index = 0; index < focusableChildren; index++) {
		surface.content.appendChild(
			createElement("button", {
				attributes: { type: "button" },
				text: `button-${index}`,
			}),
		);
	}

	// Children arrive after mount, so the dialog's focus handover runs against
	// the finished panel rather than an empty one.
	surface.update({
		show,
		placement,
		anchor: withAnchor ? anchor : null,
		onDismiss,
		dialogLabel,
	});
};

/** Scoped to the panel: tests put buttons on the page around it too. */
const buttons = (): HTMLButtonElement[] =>
	Array.from(content()?.querySelectorAll("button") ?? []);

const pressTab = (shiftKey = false): void => {
	document.dispatchEvent(
		new KeyboardEvent("keydown", { key: "Tab", bubbles: true, shiftKey }),
	);
};

beforeEach(() => {
	anchor = document.createElement("div");
	document.body.append(anchor);
});

afterEach(() => {
	surface?.destroy();
	surface = undefined;
	anchor.remove();
});

describe("where the surface renders", () => {
	it("mounts onto the body rather than the caller's container", () => {
		const container = document.createElement("div");
		document.body.appendChild(container);

		render({});

		expect(container.querySelector(LAYER_SELECTOR)).toBeNull();
		expect(layer()?.parentElement).toBe(document.body);

		container.remove();
	});

	it("goes by different names on every mount", () => {
		// A selector scraped from one page load matches nothing on the next.
		const names = new Set<string>();
		for (let attempt = 0; attempt < 10; attempt += 1) {
			render({});
			names.add(`${layer()?.className}|${content()?.className}`);
			surface?.destroy();
			surface = undefined;
		}
		expect(names.size).toBe(10);
	});

	it("keeps its names to itself in a production build", () => {
		const originalNodeEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = "production";
		try {
			render({});
			expect(document.querySelector(LAYER_SELECTOR)).toBeNull();
			expect(document.querySelector(CONTENT_SELECTOR)).toBeNull();
		} finally {
			if (undefined === originalNodeEnv) {
				Reflect.deleteProperty(process.env, "NODE_ENV");
			} else {
				process.env.NODE_ENV = originalNodeEnv;
			}
		}
	});

	it("hides rather than unmounts when not shown", () => {
		render({ show: false });

		expect(layer()?.style.display).toBe("none");
		expect(
			content()?.querySelector("[data-testid='challenge']"),
		).not.toBeNull();
	});
});

describe("popup", () => {
	it("is the default placement", () => {
		render({});

		expect(layer()?.style.position).toBe("fixed");
	});

	it("covers the page, so nothing behind it is reachable", () => {
		render({ placement: PlacementEnum.popup });

		expect(layer()?.style.display).toBe("flex");
		expect(layer()?.style.pointerEvents).toBe("");
	});

	it("keeps a tall challenge inside the viewport rather than clipping its top", () => {
		// A panel taller than the viewport used to be translated out of flow by
		// its own full height, putting the instruction ("Select all containing
		// ...") and the first row of images above the top of the screen with no
		// way to scroll back to them. In flow it is bounded and scrolls instead.
		render({ placement: PlacementEnum.popup });

		const style = content()?.style;
		expect(style?.position).not.toBe("absolute");
		expect(style?.transform).toBe("");
		expect(style?.maxHeight).toBe("100%");
		expect(style?.overflowY).toBe("auto");
	});

	it("sizes the layer to the visible viewport, not the retracted-toolbar one", () => {
		// `100vh` on iOS Safari is the toolbar-retracted height. Forcing the
		// centring box to it put the challenge's lower half under the bottom bar,
		// which is what the removed translate hack was compensating for.
		render({ placement: PlacementEnum.popup });

		expect(layer()?.style.minHeight).toBe("100dvh");
	});

	it("pins itself to all four edges of the viewport", () => {
		render({ placement: PlacementEnum.popup });

		expect(layer()?.style.getPropertyValue("inset")).toBe("0");
	});

	it("ignores an outside click", () => {
		const onDismiss = vi.fn();
		render({ placement: PlacementEnum.popup, onDismiss });

		document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));

		expect(onDismiss).not.toHaveBeenCalled();
	});
});

describe("float", () => {
	it("leaves the page usable behind it", () => {
		render({ placement: PlacementEnum.float });

		expect(layer()?.style.position).toBe("absolute");
		expect(layer()?.style.pointerEvents).toBe("none");
		expect(content()?.style.pointerEvents).toBe("auto");
	});

	it("positions the panel absolutely so the page scrolls it", () => {
		render({ placement: PlacementEnum.float });

		// Viewport-relative positioning is what made the panel drift while
		// scrolling; document-relative is what keeps it still.
		expect(content()?.style.position).toBe("absolute");
		expect(layer()?.style.position).toBe("absolute");
		expect(layer()?.style.width).toBe("0px");
		expect(layer()?.style.height).toBe("0px");
	});

	it("dismisses on a click outside the panel", () => {
		const onDismiss = vi.fn();
		render({ placement: PlacementEnum.float, onDismiss });

		document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));

		expect(onDismiss).toHaveBeenCalledTimes(1);
	});

	it("does not dismiss on a click inside the panel", () => {
		const onDismiss = vi.fn();
		render({ placement: PlacementEnum.float, onDismiss });

		content()?.dispatchEvent(new Event("pointerdown", { bubbles: true }));

		expect(onDismiss).not.toHaveBeenCalled();
	});

	it("does not dismiss on a click on the anchor", () => {
		const onDismiss = vi.fn();
		render({ placement: PlacementEnum.float, onDismiss });

		anchor.dispatchEvent(new Event("pointerdown", { bubbles: true }));

		expect(onDismiss).not.toHaveBeenCalled();
	});

	it("sits at the document origin so its child's coordinates are document ones", () => {
		render({ placement: PlacementEnum.float });

		expect(layer()?.style.top).toBe("0px");
		expect(layer()?.style.left).toBe("0px");
		expect(layer()?.style.getPropertyValue("inset")).toBe("");
	});

	it("falls back to popup with no anchor to attach to", () => {
		render({ placement: PlacementEnum.float, withAnchor: false });

		expect(layer()?.style.position).toBe("fixed");
		expect(layer()?.style.pointerEvents).toBe("");
	});

	// One element carries both layouts over its life, so each placement has to
	// clear the other's declarations rather than merely write over them.
	it("drops the popup's full-viewport box when switching to float", () => {
		render({ placement: PlacementEnum.popup, withAnchor: true });
		surface?.update({
			show: true,
			placement: PlacementEnum.float,
			anchor,
		});

		expect(layer()?.style.position).toBe("absolute");
		expect(layer()?.style.width).toBe("0px");
		expect(layer()?.style.getPropertyValue("inset")).toBe("");
		expect(layer()?.style.minHeight).toBe("");
		expect(layer()?.style.backgroundColor).toBe("");
	});

	it("restores the full-viewport box when switching back to popup", () => {
		render({ placement: PlacementEnum.float });
		surface?.update({
			show: true,
			placement: PlacementEnum.popup,
			anchor,
		});

		expect(layer()?.style.position).toBe("fixed");
		expect(layer()?.style.getPropertyValue("inset")).toBe("0");
		expect(layer()?.style.top).toBe("");
		expect(layer()?.style.width).toBe("");
		expect(layer()?.style.pointerEvents).toBe("");
	});

	it("swaps the panel between anchored and centred as the placement changes", () => {
		render({ placement: PlacementEnum.float });
		expect(content()?.style.position).toBe("absolute");

		surface?.update({ show: true, placement: PlacementEnum.popup, anchor });
		expect(content()?.style.position).toBe("relative");
		expect(content()?.style.visibility).toBe("");
		expect(content()?.style.maxHeight).toBe("100%");

		surface?.update({ show: true, placement: PlacementEnum.float, anchor });
		expect(content()?.style.position).toBe("absolute");
		expect(content()?.style.maxHeight).toBe("");
		expect(content()?.style.overflowY).toBe("");
	});
});

describe("dismissing with the keyboard", () => {
	it("closes on Escape in either placement", () => {
		for (const placement of [PlacementEnum.popup, PlacementEnum.float]) {
			const onDismiss = vi.fn();
			render({ placement, onDismiss });

			document.dispatchEvent(
				new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
			);

			expect(
				onDismiss,
				`${placement} should close on Escape`,
			).toHaveBeenCalled();

			surface?.destroy();
			surface = undefined;
		}
	});

	it("ignores other keys", () => {
		const onDismiss = vi.fn();
		render({ placement: PlacementEnum.float, onDismiss });

		document.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
		);

		expect(onDismiss).not.toHaveBeenCalled();
	});

	it("stops listening once the surface is gone", () => {
		const onDismiss = vi.fn();
		render({ placement: PlacementEnum.float, onDismiss });
		surface?.destroy();
		surface = undefined;

		document.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
		);

		expect(onDismiss).not.toHaveBeenCalled();
	});
});

describe("as a dialog", () => {
	it("stays inert for a challenge that does not name itself", () => {
		render({});

		expect(content()?.getAttribute("role")).toBeNull();
		expect(content()?.getAttribute("aria-modal")).toBeNull();
	});

	it("names itself to assistive tech once a label is given", () => {
		render({ dialogLabel: "Puzzle challenge" });

		expect(content()?.getAttribute("role")).toBe("dialog");
		expect(content()?.getAttribute("aria-modal")).toBe("true");
		expect(content()?.getAttribute("aria-label")).toBe("Puzzle challenge");
	});

	it("takes focus so a screen reader lands on the challenge", () => {
		render({ dialogLabel: "Puzzle challenge", focusableChildren: 2 });

		expect(document.activeElement).toBe(buttons()[0]);
	});

	it("falls back to the panel when it holds nothing focusable", () => {
		render({ dialogLabel: "Puzzle challenge" });

		expect(document.activeElement).toBe(content());
	});

	it("gives focus back to whatever opened it", () => {
		const opener = document.createElement("button");
		document.body.appendChild(opener);
		opener.focus();

		render({ dialogLabel: "Puzzle challenge", focusableChildren: 1 });
		expect(document.activeElement).not.toBe(opener);

		surface?.destroy();
		surface = undefined;
		expect(document.activeElement).toBe(opener);

		opener.remove();
	});

	it("keeps focus where the user put it across a re-render", () => {
		// Every update rebuilds the listeners; handing focus back to the panel
		// alongside them would yank the user out of whatever they had moved to.
		const elsewhere = document.createElement("button");
		document.body.appendChild(elsewhere);
		render({ dialogLabel: "Puzzle challenge", focusableChildren: 1 });
		elsewhere.focus();

		surface?.update({
			show: true,
			anchor,
			dialogLabel: "Puzzle challenge",
		});

		expect(document.activeElement).toBe(elsewhere);
		elsewhere.remove();
	});

	it("wraps tab from the last control back to the first", () => {
		render({ dialogLabel: "Puzzle challenge", focusableChildren: 2 });
		const [first, last] = buttons();
		last?.focus();

		pressTab();

		expect(document.activeElement).toBe(first);
	});

	it("wraps shift-tab from the first control back to the last", () => {
		render({ dialogLabel: "Puzzle challenge", focusableChildren: 2 });
		const [first, last] = buttons();
		first?.focus();

		pressTab(true);

		expect(document.activeElement).toBe(last);
	});

	it("pulls focus back in if it has escaped to the page", () => {
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		render({ dialogLabel: "Puzzle challenge", focusableChildren: 2 });
		outside.focus();

		pressTab();

		expect(document.activeElement).toBe(buttons()[0]);
		outside.remove();
	});

	it("leaves tab alone for a challenge that is not a dialog", () => {
		render({ focusableChildren: 2 });
		const [, last] = buttons();
		last?.focus();

		pressTab();

		expect(document.activeElement).toBe(last);
	});
});
