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

import type { GlyphKind } from "./glyphs.js";

/**
 * Frame and icon sizing. Widget-coupled and not exposed to operators — the
 * widget scales the served background to its own container, and every
 * coordinate the provider stores is in these background pixels.
 */
export interface IconOrderGeometry {
	width: number;
	height: number;
	/** Bounding box of one icon, in px. */
	iconSize: number;
}

/**
 * One icon stamped onto the frame.
 *
 * SECURITY: a placement is the answer. Placements for the icons the user must
 * click are persisted on the challenge record and never serialised to the
 * widget — the widget receives pixels and nothing else. See
 * `docs` on `renderIconOrder` for why the legend cannot leak them either.
 */
export interface IconPlacement {
	/** Centre of the icon, in background pixels. */
	x: number;
	y: number;
	kind: GlyphKind;
	/** Degrees, clockwise. */
	rotation: number;
	/** Stroke hue in degrees; the halo is always dark. */
	hue: number;
	/** Bounding box of this icon, in px. */
	size: number;
}

export interface RenderedIconOrder {
	/** Frame with every icon (targets and decoys) composited, WebP. */
	background: Buffer;
	/** The ordered target icons on transparency, WebP. */
	legend: Buffer;
	/** Height of the legend strip in px; its width is a multiple of this. */
	legendIconSize: number;
	/**
	 * The icons the user must click, in the order the legend shows them.
	 * Provider-only — must never reach a response body.
	 */
	targets: IconPlacement[];
}

/**
 * Per-render tunables, resolved by the provider from asset defaults <-
 * client settings <- traffic-filter category override, exactly as the puzzle
 * type resolves its own.
 */
export interface IconOrderRenderSettings {
	/** How many icons the user must click, in order. */
	targetCount: number;
	/**
	 * Icons stamped on the frame that are absent from the legend. They make
	 * the frame a search problem rather than a "click every icon" problem, so
	 * a detector that finds icon-like regions still has to solve which ones
	 * count. Set 0 to disable.
	 */
	decoyCount: number;
	/** Bright inner stroke width, in px at the icon's own scale. */
	strokeWidth: number;
	/**
	 * Opacity of the bright inner stroke, 0..1. Lower sinks the icons into
	 * the background — harder for a solver's edge detector, and harder for
	 * the user.
	 */
	iconOpacity: number;
	/**
	 * Opacity of the dark halo drawn under each icon, 0..1. The halo is what
	 * keeps a bright stroke legible where it crosses a light region of the
	 * background; without it icons vanish over pale areas.
	 */
	haloOpacity: number;
	/**
	 * Scales every family of background collage element at once — panels,
	 * ripple rings and bars. Higher is a busier frame: more competing strokes
	 * and corners for a detector to sift through, and a harder search for the
	 * user.
	 */
	backgroundClutter: number;
}
