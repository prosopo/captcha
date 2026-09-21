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
import type { Component } from "@prosopo/procaptcha-common";
import { CaptchaItemTypes, type HashedItem } from "@prosopo/types";
import { darkTheme, lightTheme } from "@prosopo/widget-skeleton";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
	type CaptchaWidgetProps,
	mountCaptchaWidget,
} from "../components/captchaWidget.js";
import { captcha } from "./harness.js";
import { type Mounted, asRgb, fire, mount } from "./render.js";

let mounted: Mounted;
let widget: Component<CaptchaWidgetProps> | undefined;
const onClick = vi.fn<(hash: string, x: number, y: number) => void>();

const item = (hash: string, data = `https://provider.one/${hash}.png`) => ({
	hash,
	data,
	type: CaptchaItemTypes.Image,
});

const props = (
	overrides: {
		items?: HashedItem[];
		solution?: [string, number, number][];
		themeColor?: "light" | "dark";
	} = {},
): CaptchaWidgetProps => ({
	challenge: captcha(overrides.items ? { items: overrides.items } : {}),
	solution: overrides.solution ?? [],
	onClick,
	themeColor: overrides.themeColor ?? "light",
});

const render = (overrides: Parameters<typeof props>[0] = {}): void => {
	if (widget) {
		widget.update(props(overrides));
	} else {
		widget = mountCaptchaWidget(mounted.container, props(overrides));
	}
};

const tiles = (): HTMLImageElement[] =>
	Array.from(mounted.container.querySelectorAll("img"));

const grid = (): HTMLElement => {
	const element = mounted.container.firstElementChild;
	if (!(element instanceof HTMLElement)) {
		throw new Error("expected a grid to be rendered");
	}
	return element;
};

const pixels = (value: string): number => Number.parseFloat(value);

const clickable = (index: number): HTMLElement => {
	const image = tiles()[index];
	const target = image?.parentElement;
	if (!target) throw new Error(`expected a tile at index ${index}`);
	return target;
};

const overlays = (): HTMLElement[] =>
	Array.from(mounted.container.querySelectorAll("svg")).map(
		(svg: SVGElement) => {
			const parent = svg.parentElement;
			if (!parent) throw new Error("expected an overlay around the check icon");
			return parent;
		},
	);

beforeEach(() => {
	vi.clearAllMocks();
	mounted = mount();
	widget = undefined;
});

afterEach(() => {
	widget?.destroy();
	mounted.unmount();
});

describe("what the grid renders", () => {
	test("shows one image per item", () => {
		render();
		expect(tiles()).toHaveLength(2);
	});

	test("points each image at the url the provider gave", () => {
		render();
		expect(tiles()[0]?.getAttribute("src")).toBe(
			"https://provider.one/img/1.png",
		);
	});

	test("numbers the alt text from one, for a screen reader", () => {
		render();
		expect(tiles().map((image: HTMLImageElement) => image.alt)).toEqual([
			"Captcha image 1",
			"Captcha image 2",
		]);
	});

	test("renders an empty grid for a captcha with no items", () => {
		// Nothing to select is a provider fault, but it must not take the page
		// down with it — the user can still cancel or reload.
		render({ items: [] });
		expect(tiles()).toHaveLength(0);
		expect(mounted.container.firstElementChild).not.toBeNull();
	});

	test("renders a single-item captcha", () => {
		render({ items: [item("only")] });
		expect(tiles()).toHaveLength(1);
	});

	test("keeps a large grid intact", () => {
		const many = Array.from({ length: 9 }, (_: unknown, index: number) =>
			item(`hash-${index}`),
		);
		render({ items: many });
		expect(tiles()).toHaveLength(9);
	});

	test("renders an item with no image url as an empty image", () => {
		render({ items: [item("hash-1", "")] });
		// The tile still renders, it just has no image to show.
		expect(tiles()).toHaveLength(1);
		expect(tiles()[0]?.getAttribute("src")).toBe("");
	});

	test("refuses to render an item with no hash", () => {
		// Without a hash a tile can never be reported as selected, so the
		// challenge is unanswerable and the fault belongs upstream.
		expect(() => render({ items: [item("")] })).toThrow(
			"CAPTCHA.MISSING_ITEM_HASH",
		);
	});
});

describe("theming", () => {
	test("borders the images with the light theme tile outline", () => {
		render({ themeColor: "light" });
		expect(tiles()[0]?.style.borderColor).toBe(
			asRgb(lightTheme.palette.tile.border),
		);
	});

	test("borders the images with the dark theme tile outline", () => {
		render({ themeColor: "dark" });
		expect(tiles()[0]?.style.borderColor).toBe(
			asRgb(darkTheme.palette.tile.border),
		);
	});

	test("pads the grid away from the header and the button row", () => {
		// Neither the instruction header above nor the controls below pad against
		// the grid, so this is the only thing separating them from the images. The
		// exact amount is drawn per mount, so only the range is fixed.
		render();
		expect(pixels(grid().style.paddingTop)).toBeGreaterThanOrEqual(6);
		expect(pixels(grid().style.paddingTop)).toBeLessThanOrEqual(14);
		expect(pixels(grid().style.paddingBottom)).toBeGreaterThanOrEqual(6);
		expect(pixels(grid().style.paddingBottom)).toBeLessThanOrEqual(14);
	});

	test("keeps the same padding after a rebuild", () => {
		// The grid styles are re-applied on rebuild, which is what a theme change
		// triggers — dropping them there would lose the spacing on the second
		// round, and redrawing them would shift the tiles under the user's cursor.
		render();
		const before = grid().style.paddingTop;
		render({ themeColor: "dark" });
		expect(grid().style.paddingTop).toBe(before);
	});
});

describe("the geometry a solver would write down", () => {
	test("spaces the tiles differently on every mount", () => {
		const gaps = new Set(
			Array.from({ length: 30 }, () => {
				const container = mount();
				const instance = mountCaptchaWidget(container.container, props());
				const gap =
					container.container.querySelector<HTMLElement>("div")?.style.gap ??
					"";
				instance.destroy();
				container.unmount();
				return gap;
			}),
		);
		expect(gaps.size).toBeGreaterThan(1);
	});

	test("gives each cell room for the gap it was drawn with", () => {
		// Three columns fit only if each cell gives up two thirds of a gap. A
		// basis written independently of the gap wraps the row at the wide end of
		// the range, which is four rows of images instead of three.
		render();
		const gap = pixels(grid().style.gap);
		const cell = tiles()[0]?.parentElement?.parentElement;
		const deducted = Math.round((200 * gap) / 3) / 100;
		expect(cell?.style.flexBasis).toBe(`calc(33.333% - ${deducted}px)`);
	});
});

describe("selection", () => {
	test("hides the tick on an unselected image", () => {
		render();
		expect(overlays()[0]?.style.visibility).toBe("hidden");
	});

	test("shows the tick on the image the user picked", () => {
		render({ solution: [["hash-2", 1, 2]] });
		expect(overlays()[0]?.style.visibility).toBe("hidden");
		expect(overlays()[1]?.style.visibility).toBe("visible");
	});

	test("shows every selected image at once", () => {
		render({
			solution: [
				["hash-1", 0, 0],
				["hash-2", 0, 0],
			],
		});
		expect(overlays().map((o: HTMLElement) => o.style.visibility)).toEqual([
			"visible",
			"visible",
		]);
	});

	test("ignores a selection naming an image that is not on screen", () => {
		render({ solution: [["hash-missing", 0, 0]] });
		expect(overlays().map((o: HTMLElement) => o.style.visibility)).toEqual([
			"hidden",
			"hidden",
		]);
	});

	test("updating the selection does not reload the images", () => {
		// Rebuilding the grid would restart every image request and flash the
		// tiles, which is the one thing the old reconciler was earning its keep
		// for.
		const first = props();
		widget = mountCaptchaWidget(mounted.container, first);
		const before = tiles();

		widget.update({ ...first, solution: [["hash-1", 0, 0]] });

		expect(tiles()[0]).toBe(before[0]);
		expect(tiles()[1]).toBe(before[1]);
		expect(overlays()[0]?.style.visibility).toBe("visible");
	});

	test("rebuilds the grid when the round changes", () => {
		render();
		const before = tiles();
		widget?.update(props({ items: [item("fresh")] }));
		expect(tiles()).toHaveLength(1);
		expect(tiles()[0]).not.toBe(before[0]);
	});
});

describe("reaching the tiles without a mouse", () => {
	test("each tile is a button, whichever element it is made of", () => {
		// The element is drawn per tile, so `button` no longer finds them all —
		// but every variant is still a button to assistive tech and to the
		// keyboard.
		render();
		for (const index of [0, 1]) {
			const tile = clickable(index);
			if ("BUTTON" === tile.tagName) {
				expect(tile.getAttribute("type")).toBe("button");
			} else {
				expect(tile.getAttribute("role")).toBe("button");
				expect(tile.getAttribute("tabindex")).toBe("0");
			}
		}
	});

	test("picks the element per tile, not once for the grid", () => {
		const tags = new Set<string>();
		for (let attempt = 0; attempt < 40; attempt += 1) {
			const container = mount();
			const instance = mountCaptchaWidget(container.container, props());
			for (const image of container.container.querySelectorAll("img")) {
				const tag = image.parentElement?.tagName;
				if (tag) {
					tags.add(tag);
				}
			}
			instance.destroy();
			container.unmount();
		}
		expect(Array.from(tags).sort()).toEqual(["BUTTON", "DIV"]);
	});

	test("selects a tile on Enter and on Space", () => {
		// A tile only a mouse can reach is no challenge at all for a keyboard
		// user, and the generic variant gets none of this for free.
		const draws = vi.spyOn(Math, "random").mockReturnValue(0.99);
		try {
			render();
		} finally {
			draws.mockRestore();
		}

		fire(clickable(0), "keydown", { key: "Enter" });
		fire(clickable(1), "keydown", { key: " " });

		expect(onClick).toHaveBeenNthCalledWith(1, "hash-1", 0, 0);
		expect(onClick).toHaveBeenNthCalledWith(2, "hash-2", 0, 0);
	});

	test("an unpicked tile says so", () => {
		render();
		expect(clickable(0).getAttribute("aria-pressed")).toBe("false");
	});

	test("a picked tile says so, rather than only looking picked", () => {
		render({ solution: [["hash-2", 1, 2]] });
		expect(clickable(0).getAttribute("aria-pressed")).toBe("false");
		expect(clickable(1).getAttribute("aria-pressed")).toBe("true");
	});

	test("the tile takes its name from the image it holds", () => {
		render();
		expect(clickable(0).textContent).toBe("");
		expect(tiles()[0]?.alt).toBe("Captcha image 1");
	});
});

describe("clicking an image", () => {
	test("reports the hash and where the user clicked", () => {
		render();
		fire(clickable(0), "click", { clientX: 12, clientY: 34 });
		expect(onClick).toHaveBeenCalledWith("hash-1", 12, 34);
	});

	test("reports the second image by its own hash", () => {
		render();
		fire(clickable(1), "click", { clientX: 1, clientY: 2 });
		expect(onClick).toHaveBeenCalledWith("hash-2", 1, 2);
	});

	test("ignores a synthetic click", () => {
		// A script-dispatched click is an automated solver selecting tiles.
		render();
		fire(clickable(0), "click", { trusted: false, clientX: 5, clientY: 6 });
		expect(onClick).not.toHaveBeenCalled();
	});

	test("reports a click at the origin as (0, 0)", () => {
		render();
		fire(clickable(0), "click");
		expect(onClick).toHaveBeenCalledWith("hash-1", 0, 0);
	});

	test("reports every click, so a second one can deselect", () => {
		render();
		fire(clickable(0), "click", { clientX: 1, clientY: 1 });
		fire(clickable(0), "click", { clientX: 2, clientY: 2 });
		expect(onClick).toHaveBeenCalledTimes(2);
	});

	test("a click on the image itself still reports the tile", () => {
		// The handler sits on the wrapper, so the event has to bubble.
		render();
		const image = tiles()[0];
		if (!image) throw new Error("expected an image");
		fire(image, "click", { clientX: 3, clientY: 4 });
		expect(onClick).toHaveBeenCalledWith("hash-1", 3, 4);
	});

	test("a destroyed grid stops reporting clicks", () => {
		render();
		const target = clickable(0);
		widget?.destroy();
		widget = undefined;
		target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		expect(onClick).not.toHaveBeenCalled();
	});
});

describe("images that fail to load", () => {
	const failLoad = (image: HTMLImageElement): void => {
		image.dispatchEvent(new Event("error", { bubbles: true }));
	};

	test("retries with a cache-busting url", () => {
		render();
		const image = tiles()[0];
		if (!image) throw new Error("expected an image");
		failLoad(image);
		expect(image.getAttribute("src")).toMatch(
			/^https:\/\/provider\.one\/img\/1\.png\?retry=\d+$/,
		);
	});

	test("gives up after three retries rather than looping forever", () => {
		// A provider that has genuinely lost the image would otherwise have the
		// page hammering it for as long as the challenge is open.
		render();
		const image = tiles()[0];
		if (!image) throw new Error("expected an image");
		for (let attempt = 0; attempt < 3; attempt++) failLoad(image);
		const afterThird = image.getAttribute("src");
		failLoad(image);
		expect(image.getAttribute("src")).toBe(afterThird);
		expect(image.dataset.retryCount).toBe("4");
	});

	test("counts retries per image, not across the grid", () => {
		render();
		const [first, second] = tiles();
		if (!first || !second) throw new Error("expected two images");
		for (let attempt = 0; attempt < 4; attempt++) failLoad(first);
		failLoad(second);
		expect(second.getAttribute("src")).toMatch(/\?retry=\d+$/);
	});
});
