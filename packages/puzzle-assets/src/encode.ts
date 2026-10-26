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

import sharp from "sharp";
import type { RgbaImage } from "./types.js";

/**
 * Background quality is deliberately high. WebP's chroma subsampling and
 * ringing around the cut are exactly the kind of artefact an attacker could
 * key on, *and* at q<95 the ringing becomes visually obvious around the
 * decoy piece silhouettes we paint on top of the background — the mix of
 * bright edge-rim and dark drop-shadow at the decoy edge is precisely the
 * high-contrast local signal WebP butchers hardest. At 300x200 the extra few
 * kilobytes of a higher quality setting are trivial.
 */
const BACKGROUND_QUALITY = 95;

export const encodeBackground = (image: RgbaImage): Promise<Buffer> =>
	sharp(image.data, {
		raw: { width: image.width, height: image.height, channels: 4 },
	})
		.webp({ quality: BACKGROUND_QUALITY, alphaQuality: 100, effort: 4 })
		.toBuffer();

/**
 * Lossless. The piece is a 44x44 sprite on transparency, and lossy WebP's
 * ringing around the alpha edge is the dominant visual artefact — a subtle
 * ripple that reads as wavy edges even at q=92. Lossless costs ~4 KB per
 * piece instead of ~2 KB, which is nothing over the wire, and eliminates
 * the ringing entirely.
 */
export const encodePiece = (image: RgbaImage): Promise<Buffer> =>
	sharp(image.data, {
		raw: { width: image.width, height: image.height, channels: 4 },
	})
		.webp({ lossless: true, alphaQuality: 100, effort: 4 })
		.toBuffer();

/** PNG, for the preview script only — lossless so artefacts are visible. */
export const encodePng = (image: RgbaImage): Promise<Buffer> =>
	sharp(image.data, {
		raw: { width: image.width, height: image.height, channels: 4 },
	})
		.png()
		.toBuffer();

export const toDataUri = (webp: Buffer): string =>
	`data:image/webp;base64,${webp.toString("base64")}`;
