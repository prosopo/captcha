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

import { describe, expect, it } from "vitest";
import { computeFloatPosition } from "../reactComponents/ChallengeSurface.js";

const VIEWPORT_WIDTH = 1000;
const VIEWPORT_HEIGHT = 800;

// jsdom gives every element a zero rect, so rects are built by hand.
const rect = (
	left: number,
	top: number,
	width: number,
	height: number,
): DOMRect =>
	({
		left,
		top,
		width,
		height,
		right: left + width,
		bottom: top + height,
		x: left,
		y: top,
		toJSON: () => ({}),
	}) as DOMRect;

const PANEL_HEIGHT = 250;

const place = (
	anchor: DOMRect,
	panelHeight = PANEL_HEIGHT,
	scrollX = 0,
	scrollY = 0,
) => computeFloatPosition(anchor, panelHeight, scrollX, scrollY);

describe("computeFloatPosition", () => {
	it("sits directly above the anchor", () => {
		const anchor = rect(100, 300, 300, 78);

		const { top, left } = place(anchor);

		expect(top).toBe(anchor.top - PANEL_HEIGHT - 8);
		expect(left).toBe(anchor.left);
	});

	it("stays above the anchor even when the space below is larger", () => {
		// Plenty of room below, none of which should tempt it downwards.
		const anchor = rect(100, 400, 300, 50);

		const { top } = place(anchor);

		expect(top).toBe(anchor.top - PANEL_HEIGHT - 8);
		expect(top + PANEL_HEIGHT).toBeLessThan(anchor.top);
	});

	it("converts the viewport rect into document coordinates", () => {
		const anchor = rect(100, 300, 300, 78);

		const { top, left } = place(anchor, PANEL_HEIGHT, 40, 500);

		expect(top).toBe(anchor.top + 500 - PANEL_HEIGHT - 8);
		expect(left).toBe(anchor.left + 40);
	});

	it("does not move when only the scroll offset changes", () => {
		// The same widget, seen after scrolling 200px: its viewport rect moves
		// up by exactly what the scroll offset gains, so the document position
		// is unchanged and the panel does not drift.
		const unscrolled = place(rect(100, 300, 300, 78), PANEL_HEIGHT, 0, 0);
		const scrolled = place(rect(100, 100, 300, 78), PANEL_HEIGHT, 0, 200);

		expect(scrolled).toEqual(unscrolled);
	});

	it("tracks a taller panel so its bottom edge stays on the anchor", () => {
		const anchor = rect(100, 600, 300, 78);

		const short = place(anchor, 100);
		const tall = place(anchor, 400);

		expect(short.top + 100).toBe(tall.top + 400);
	});

	it("clamps to the top of the document rather than going out of reach", () => {
		const anchor = rect(100, 20, 300, 78);

		const { top } = place(anchor, PANEL_HEIGHT);

		expect(top).toBe(0);
	});
});
