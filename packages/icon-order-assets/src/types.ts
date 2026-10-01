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

/** Widget-coupled; every stored coordinate is in these background pixels. */
export interface IconOrderGeometry {
	width: number;
	height: number;
	/** Bounding box of one icon, in px. */
	iconSize: number;
}

/** SECURITY: a target's placement is the answer and must never reach the widget. */
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
	/** The target icons in click order, WebP. */
	legend: Buffer;
	/** Height of the legend strip in px. */
	legendIconSize: number;
	/** The answer, in click order. Must never reach a response body. */
	targets: IconPlacement[];
}

/** Per-render tunables; the provider layers operator overrides onto the defaults. */
export interface IconOrderRenderSettings {
	/** How many icons the user must click, in order. */
	targetCount: number;
	/** Icons on the frame that are not in the legend. */
	decoyCount: number;
	/** Bright inner stroke width, in px at the icon's own scale. */
	strokeWidth: number;
	/** Opacity of the bright inner stroke, 0..1. */
	iconOpacity: number;
	/** Opacity of the dark outline under each icon, 0..1. */
	haloOpacity: number;
	/** Scales the number of every kind of background collage element. */
	backgroundClutter: number;
}
