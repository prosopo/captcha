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

/**
 * A tile is a hard-edged symbol on a smooth gradient, which is normally the
 * content lossy WebP handles worst. Here it does not: the silhouette is a
 * single flat ink colour with an anti-aliased edge and no texture either side,
 * so there is nothing for ringing to key on. Compared at 3x zoom, q92 is
 * indistinguishable from lossless while costing roughly half the bytes — which
 * matters, because a board ships a dozen or so tiles as data URIs in one
 * response.
 *
 * `effort` stays at the default 4 deliberately. Raising it to 6 buys under 3%
 * on size and costs ~40ms per tile of provider CPU on the challenge path.
 */
export const encodeTile = (svg: string): Promise<Buffer> =>
	sharp(Buffer.from(svg))
		.webp({ quality: 92, alphaQuality: 100, effort: 4 })
		.toBuffer();

/** PNG, for the preview script only. */
export const encodePng = (svg: string): Promise<Buffer> =>
	sharp(Buffer.from(svg)).png().toBuffer();

export const toDataUri = (webp: Buffer): string =>
	`data:image/webp;base64,${webp.toString("base64")}`;
