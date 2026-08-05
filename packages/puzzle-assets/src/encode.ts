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
 * Quality is deliberately high. WebP's chroma subsampling and ringing around
 * the cut are exactly the kind of artefact an attacker could key on, and at
 * 300x200 the byte savings from a lower setting are not worth it.
 */
const BACKGROUND_QUALITY = 88;
const PIECE_QUALITY = 92;

const toWebp = (image: RgbaImage, quality: number): Promise<Buffer> =>
	sharp(image.data, {
		raw: { width: image.width, height: image.height, channels: 4 },
	})
		.webp({ quality, alphaQuality: 100, effort: 4 })
		.toBuffer();

export const encodeBackground = (image: RgbaImage): Promise<Buffer> =>
	toWebp(image, BACKGROUND_QUALITY);

export const encodePiece = (image: RgbaImage): Promise<Buffer> =>
	toWebp(image, PIECE_QUALITY);

/** PNG, for the preview script only — lossless so artefacts are visible. */
export const encodePng = (image: RgbaImage): Promise<Buffer> =>
	sharp(image.data, {
		raw: { width: image.width, height: image.height, channels: 4 },
	})
		.png()
		.toBuffer();

export const toDataUri = (webp: Buffer): string =>
	`data:image/webp;base64,${webp.toString("base64")}`;
