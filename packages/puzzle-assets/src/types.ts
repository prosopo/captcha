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

/** Straight (non-premultiplied) RGBA, row-major, 4 bytes per pixel. */
export interface RgbaImage {
	data: Buffer;
	width: number;
	height: number;
}

/** Where the notch was cut, in background pixel coordinates (centre point). */
export interface NotchPlacement {
	targetX: number;
	targetY: number;
}

export interface RenderedPuzzle {
	/** Background with the notch cut into it, WebP. */
	background: Buffer;
	/** The draggable piece on transparency, WebP. */
	piece: Buffer;
	/** Piece bounding-box size in px; the widget centres it on the cursor. */
	pieceSize: number;
}

export interface PuzzleGeometry {
	width: number;
	height: number;
	/** Bounding box of the notch/piece, in px. */
	notchSize: number;
}

/**
 * Per-render tunables. Every field is a number with sensible bounds enforced
 * upstream in `packages/types/src/client/settings.ts` — this interface just
 * carries the resolved effective values through to the pixel pipeline.
 */
export interface PuzzleRenderSettings {
	/**
	 * Number of decoy jigsaw silhouettes to scatter on the background. They
	 * sit on top of the base gradient and are drawn as shallow indents so
	 * a CV solver looking for "a jigsaw-shaped region" gets many candidates
	 * to disambiguate. Set 0 to disable.
	 */
	decoyCount: number;
	/**
	 * Amplitude of the dark inner rim on each decoy, in 0-255 units. Higher
	 * makes decoys more prominent (harder to distinguish from the real cut
	 * at a glance); lower makes them fade into the background.
	 */
	decoyEdgeDarkness: number;
	/**
	 * Uniform brightness lift/dim on the decoy body, in 0-255 units.
	 * Positive lifts the interior (decoy reads as raised), negative dims
	 * it (decoy reads as indented). Small values keep decoys subtle.
	 */
	decoyBodyBrightness: number;
	/**
	 * Multiplier applied to the real cutout's pixels. Lower is darker (a
	 * more obvious target for the human user); higher lets the cutout
	 * blend closer to the decoys. Bounded 0..1 by the schema.
	 */
	holeDarken: number;
}
