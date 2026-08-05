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
