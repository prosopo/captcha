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
 * What the widget actually measures, in a real layout engine.
 *
 * The widget is embedded in pages we do not control, so the host box can size
 * it in any of the ways CSS allows. Half of those ask the widget how wide it
 * wants to be rather than telling it, and the widget has repeatedly had no
 * answer to give: `container-type: size` on __wrapper means it is measured as
 * if empty, and every other box sizes in percentages, which resolve as `auto`
 * against an indefinite width. The widget then laid out at its `min-width`
 * floor in its smallest container-query breakpoint — a 170px box with a 10px
 * label — on a page with room for all 302px of it.
 *
 * jsdom cannot catch that: it has no layout. These cases are the host boxes
 * that bug reports have come from, each at a width that leaves room for the
 * widget and a width that does not.
 */

import { afterEach, describe, expect, test } from "vitest";
import { WIDGET_MAX_WIDTH, WIDGET_MIN_WIDTH } from "../constants.js";
import { lightTheme } from "../theme.js";
import { createWidgetSkeleton } from "../webComponent/createWidget.js";

const NATURAL = Number.parseInt(WIDGET_MAX_WIDTH, 10);
const FLOOR = Number.parseInt(WIDGET_MIN_WIDTH, 10);

/** How the host box decides the widget's width. */
interface Host {
	readonly name: string;
	/** Style on the box between the sized parent and the widget. */
	readonly style: string;
	/** Style on the parent, when the host needs one (a grid or flex context). */
	readonly parentStyle?: string;
}

const HOSTS: readonly Host[] = [
	// Tells the widget how wide it is. These two never broke.
	{ name: "block", style: "" },
	{
		name: "stretched flex item",
		style: "flex: 1",
		parentStyle: "display: flex",
	},

	// Asks the widget how wide it wants to be. Every one of these laid the
	// widget out at its floor before the measuring row existed.
	{ name: "inline-block", style: "display: inline-block" },
	{ name: "float", style: "float: left" },
	{ name: "fit-content", style: "width: fit-content" },
	{ name: "table cell", style: "display: table-cell" },
	{ name: "flex item", style: "", parentStyle: "display: flex" },
	{
		// The common centred-form layout: a column flex container whose
		// align-items makes every row shrink to its own content.
		name: "flex column with align-items",
		style: "",
		parentStyle: "display: flex; flex-direction: column; align-items: center",
	},
	{
		name: "auto grid track",
		style: "",
		parentStyle: "display: grid; grid-template-columns: auto 1fr",
	},
	{
		name: "absolutely positioned",
		style: "position: absolute; top: 0; left: 0",
		parentStyle: "position: relative; height: 100px",
	},
];

/**
 * Lays the widget out inside `host`, itself inside a parent of `parentWidth`,
 * and returns the width the widget came out at.
 */
const widthInside = (host: Host, parentWidth: number): number => {
	const parent = document.createElement("div");
	parent.setAttribute(
		"style",
		`width: ${parentWidth}px; ${host.parentStyle ?? ""}`,
	);

	const box = document.createElement("div");
	box.setAttribute("style", host.style);
	parent.appendChild(box);

	// An auto grid track needs a second item, or the 1fr column is absent and
	// the track is the only one and stretches.
	if (host.parentStyle?.includes("grid")) {
		parent.appendChild(document.createElement("div"));
	}

	document.body.appendChild(parent);
	createWidgetSkeleton(box, lightTheme, "prosopo-procaptcha");

	const outer = box.querySelector(".prosopo-widget__outer");
	if (null === outer) {
		throw new Error("widget did not render");
	}
	return Math.round(outer.getBoundingClientRect().width);
};

afterEach(() => {
	document.body.innerHTML = "";
});

describe("widget width", () => {
	test.each(HOSTS.map((h): [string, Host] => [h.name, h]))(
		"fills its natural width inside a wide %s",
		(_name: string, host: Host) => {
			// The reported bug: 170px here, in a host with room for 302px.
			expect(widthInside(host, 500)).toBe(NATURAL);
		},
	);

	test.each(HOSTS.map((h): [string, Host] => [h.name, h]))(
		"shrinks into a narrow %s rather than overflowing it",
		(_name: string, host: Host) => {
			// The trap on the other side: stating a definite width fixes the
			// case above and breaks this one, because a definite width sets
			// min-content as well as max-content.
			expect(widthInside(host, 250)).toBe(250);
		},
	);

	test.each(HOSTS.map((h): [string, Host] => [h.name, h]))(
		"stops shrinking at its floor inside a %s below it",
		(_name: string, host: Host) => {
			// Below the floor the widget scrolls instead of laying out smaller,
			// so a definite-width host clips it and a shrink-to-fit host gets
			// the floor itself. Either way the widget never renders narrower.
			const width: number = widthInside(host, 120);
			expect(width).toBeLessThanOrEqual(FLOOR);
		},
	);

	test("is unaffected by how short its host is", () => {
		// Height is independent: a short host clips the widget, it does not
		// squeeze it, and nothing about that may change its width.
		const parent = document.createElement("div");
		parent.setAttribute(
			"style",
			"width: 500px; height: 40px; overflow: hidden",
		);
		document.body.appendChild(parent);
		createWidgetSkeleton(parent, lightTheme, "prosopo-procaptcha");

		const outer = parent.querySelector(".prosopo-widget__outer");
		expect(Math.round(outer?.getBoundingClientRect().width ?? 0)).toBe(NATURAL);
	});

	test("keeps the measuring row out of the painted widget", () => {
		// It exists only to be measured. Any height at all and it pushes the
		// widget's content box down inside a fixed-height host.
		const parent = document.createElement("div");
		parent.setAttribute("style", "width: 500px");
		document.body.appendChild(parent);
		createWidgetSkeleton(parent, lightTheme, "prosopo-procaptcha");

		const row = parent.querySelector(".prosopo-widget__intrinsic");
		expect(row?.getBoundingClientRect().height).toBe(0);
	});
});
