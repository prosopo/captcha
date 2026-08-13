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
		// the grid, so this is the only thing separating them from the images.
		render();
		const grid = mounted.container.firstElementChild as HTMLElement;
		expect(grid.style.paddingTop).toBe(`${lightTheme.spacing.unit}px`);
		expect(grid.style.paddingBottom).toBe(`${lightTheme.spacing.unit}px`);
	});

	test("keeps the padding after a rebuild", () => {
		// The grid styles are re-applied on rebuild, which is what a theme change
		// triggers — dropping them there would lose the spacing on the second round.
		render();
		render({ themeColor: "dark" });
		const grid = mounted.container.firstElementChild as HTMLElement;
		expect(grid.style.paddingTop).toBe(`${darkTheme.spacing.unit}px`);
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
