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
	placement?: PlacementType;
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
		render({});

		expect(container.querySelector(".prosopo-challenge-surface")).toBeNull();
		expect(layer()?.parentElement).toBe(document.body);
	});

	it("hides rather than unmounts when not shown", () => {
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
		render({ placement: PlacementEnum.popup });

		expect(layer()?.style.display).toBe("flex");
		expect(layer()?.style.pointerEvents).toBe("");
	});

	it("ignores an outside click", () => {
		const onDismiss = vi.fn();
		render({ placement: PlacementEnum.popup, onDismiss });

		act(() => {
			document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
		});

		expect(onDismiss).not.toHaveBeenCalled();
	});
});

describe("float", () => {
	it("leaves the page usable behind it", () => {
		render({ placement: PlacementEnum.float });

		expect(layer()?.className).toContain("prosopo-challenge-surface--float");
		expect(layer()?.style.pointerEvents).toBe("none");
		expect(content()?.style.pointerEvents).toBe("auto");
	});

	it("dismisses on a click outside the panel", () => {
		const onDismiss = vi.fn();
		render({ placement: PlacementEnum.float, onDismiss });

		act(() => {
			document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
		});

		expect(onDismiss).toHaveBeenCalledTimes(1);
	});

	it("does not dismiss on a click inside the panel", () => {
		const onDismiss = vi.fn();
		render({ placement: PlacementEnum.float, onDismiss });

		act(() => {
			content()?.dispatchEvent(new Event("pointerdown", { bubbles: true }));
		});

		expect(onDismiss).not.toHaveBeenCalled();
	});

	it("does not dismiss on a click on the anchor", () => {
		const onDismiss = vi.fn();
		render({ placement: PlacementEnum.float, onDismiss });

		act(() => {
			anchor.dispatchEvent(new Event("pointerdown", { bubbles: true }));
		});

		expect(onDismiss).not.toHaveBeenCalled();
	});

	it("falls back to popup with no anchor to attach to", () => {
		render({ placement: PlacementEnum.float, withAnchor: false });

		expect(layer()?.className).toContain("prosopo-challenge-surface--popup");
		expect(layer()?.style.pointerEvents).toBe("");
	});
});

describe("dismissing with the keyboard", () => {
	it("closes on Escape in either placement", () => {
		for (const placement of [PlacementEnum.popup, PlacementEnum.float]) {
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
		render({ placement: PlacementEnum.float, onDismiss });

		act(() => {
			document.dispatchEvent(
				new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
			);
		});

		expect(onDismiss).not.toHaveBeenCalled();
	});
});
