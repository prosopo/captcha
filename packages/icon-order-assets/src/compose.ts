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

import type { Prng, RgbaImage } from "@prosopo/puzzle-assets";
import sharp from "sharp";
import { addGrain, frameMarkup, legendMarkup } from "./markup.js";
import type {
	IconOrderGeometry,
	IconOrderRenderSettings,
	IconPlacement,
} from "./types.js";

const rasterise = async (svg: string): Promise<RgbaImage> => {
	const { data, info } = await sharp(Buffer.from(svg))
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	return { data, width: info.width, height: info.height };
};

export const compositeIcons = async (
	prng: Prng,
	icons: readonly IconPlacement[],
	geometry: IconOrderGeometry,
	settings: IconOrderRenderSettings,
): Promise<RgbaImage> =>
	addGrain(prng, await rasterise(frameMarkup(prng, icons, geometry, settings)));

export const renderLegend = (
	targets: readonly IconPlacement[],
	legendIconSize: number,
	settings: IconOrderRenderSettings,
): Promise<RgbaImage> =>
	rasterise(legendMarkup(targets, legendIconSize, settings));
