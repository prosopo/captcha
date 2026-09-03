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

const PANEL_WIDTH = 300;
const PANEL_HEIGHT = 250;

const place = (anchor: DOMRect, panelHeight = PANEL_HEIGHT) =>
	computeFloatPosition(
		anchor,
		PANEL_WIDTH,
		panelHeight,
		VIEWPORT_WIDTH,
		VIEWPORT_HEIGHT,
	);

describe("computeFloatPosition", () => {
	it("sits just below the anchor when there is room", () => {
		const anchor = rect(100, 100, 300, 78);

		const { top, left } = place(anchor);

		expect(top).toBe(anchor.bottom + 8);
		expect(left).toBe(anchor.left);
	});

	it("flips above the anchor when the space below cannot hold it", () => {
		// Anchor near the bottom: 100px below, 650px above.
		const anchor = rect(100, 650, 300, 50);

		const { top } = place(anchor);

		expect(top).toBe(anchor.top - PANEL_HEIGHT - 8);
	});

	it("stays below when neither side fits but below has more room", () => {
		const anchor = rect(100, 40, 300, 700);

		const { top } = place(anchor);

		expect(top).toBeGreaterThanOrEqual(8);
		expect(top + PANEL_HEIGHT).toBeLessThanOrEqual(VIEWPORT_HEIGHT);
	});

	it("pulls the panel back when the anchor is near the right edge", () => {
		const anchor = rect(900, 100, 80, 78);

		const { left } = place(anchor);

		expect(left).toBe(VIEWPORT_WIDTH - PANEL_WIDTH - 8);
		expect(left + PANEL_WIDTH).toBeLessThanOrEqual(VIEWPORT_WIDTH);
	});

	it("never positions the panel off the left edge", () => {
		const anchor = rect(-200, 100, 80, 78);

		const { left } = place(anchor);

		expect(left).toBe(8);
	});

	it("pins a panel taller than the viewport to the top", () => {
		const anchor = rect(100, 300, 300, 78);

		const { top } = place(anchor, VIEWPORT_HEIGHT + 400);

		expect(top).toBe(8);
	});
});
