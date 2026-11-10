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

import { cutNotch } from "./compose.js";
import {
	DECOY_CLEARANCE,
	DECOY_PLACEMENT_ATTEMPTS,
	paintDecoys,
} from "./decoys.js";
import { createNotchShape } from "./notch.js";
import {
	type Regrain,
	applyEffects,
	drawRegrainSeed,
	regrain as regrainInJs,
	samplePresentation,
} from "./presentation.js";
import type { Prng } from "./prng.js";
import type {
	NotchPlacement,
	PuzzleRenderSettings,
	PuzzleRendererVersion,
	RgbaImage,
} from "./types.js";

export const PUZZLE_RENDERER_VERSION: PuzzleRendererVersion = 2;

export interface DrawnPuzzle {
	background: RgbaImage;
	piece: RgbaImage;
}

/**
 * Paint the decoys and cut the notch. Mutates `background`.
 *
 * Each version consumes `prng` in its own order, so a stored seed only
 * reproduces a puzzle when redrawn with the version that served it.
 */
export const drawPuzzle = ({
	background,
	placement,
	pieceSize,
	settings,
	prng,
	version,
	regrain = regrainInJs,
}: {
	background: RgbaImage;
	placement: NotchPlacement;
	pieceSize: number;
	settings: PuzzleRenderSettings;
	prng: Prng;
	version: PuzzleRendererVersion;
	regrain?: Regrain;
}): DrawnPuzzle => {
	const presentation =
		version >= 2
			? samplePresentation(prng, background.width, background.height)
			: undefined;
	const sharedShape =
		version >= 2 ? createNotchShape(prng, pieceSize) : undefined;
	// Decoys go on first so the real cut sits on top of any overlap and
	// always reads as the deepest, darkest region on the board.
	paintDecoys({
		background,
		prng,
		targetCount: settings.decoyCount,
		shape: sharedShape,
		notchSize: pieceSize,
		notch: placement,
		edgeDarkness: settings.decoyEdgeDarkness,
		bodyBrightness: settings.decoyBodyBrightness,
		holeDarken: settings.decoyHoleDarken,
		style: presentation?.recess,
		...(version >= 2 && {
			layout: {
				lookalikes: settings.lookalikeDecoys ?? 0,
				clearance: DECOY_CLEARANCE,
				attempts: DECOY_PLACEMENT_ATTEMPTS,
			},
		}),
	});
	const shape = sharedShape ?? createNotchShape(prng, pieceSize);
	const cut = cutNotch({
		prng,
		background,
		shape,
		size: pieceSize,
		placement,
		holeDarken: settings.holeDarken,
		style: presentation?.recess,
	});
	if (!presentation) return cut;

	regrain(cut.background, drawRegrainSeed(prng));
	const { effects, pieceOffset } = presentation;
	applyEffects(cut.background, effects, 0, 0);
	applyEffects(cut.piece, effects, pieceOffset.x, pieceOffset.y);
	return cut;
};
