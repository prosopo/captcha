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

import { CaptchaItemTypes, type HashedItem } from "@prosopo/types";
import { darkTheme, lightTheme } from "@prosopo/widget-skeleton";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CaptchaWidget } from "../components/CaptchaWidget.js";
import { captcha } from "./harness.js";
import { type Mounted, asRgb, fire, mount } from "./render.js";

let mounted: Mounted;
const onClick = vi.fn<(hash: string, x: number, y: number) => void>();

const item = (hash: string, data = `https://provider.one/${hash}.png`) => ({
	hash,
	data,
	type: CaptchaItemTypes.Image,
});

const render = (
	props: {
		items?: HashedItem[];
		solution?: [string, number, number][];
		themeColor?: "light" | "dark";
	} = {},
): void => {
	mounted.render(
		<CaptchaWidget
			challenge={captcha(props.items ? { items: props.items } : {})}
			solution={props.solution ?? []}
			onClick={onClick}
			themeColor={props.themeColor ?? "light"}
		/>,
	);
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
	Array.from(mounted.container.querySelectorAll("svg")).map((svg) => {
		const parent = svg.parentElement;
		if (!parent) throw new Error("expected an overlay around the check icon");
		return parent;
	});

beforeEach(() => {
	vi.clearAllMocks();
	mounted = mount();
});

afterEach(() => {
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
		expect(tiles().map((image) => image.alt)).toEqual([
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
		const many = Array.from({ length: 9 }, (_, index) => item(`hash-${index}`));
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
		expect(overlays().map((o) => o.style.visibility)).toEqual([
			"visible",
			"visible",
		]);
	});

	test("ignores a selection naming an image that is not on screen", () => {
		render({ solution: [["hash-missing", 0, 0]] });
		expect(overlays().map((o) => o.style.visibility)).toEqual([
			"hidden",
			"hidden",
		]);
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
});

describe("images that fail to load", () => {
	const failLoad = (image: HTMLImageElement): void => {
		act(() => {
			image.dispatchEvent(new Event("error", { bubbles: true }));
		});
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
