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

import type { Logger } from "@prosopo/logger";
import {
	DEFAULT_GEOMETRY,
	DEFAULT_RENDER_SETTINGS,
	type NotchPlacement,
	type PuzzleRenderSettings,
	renderPuzzle,
	toDataUri,
} from "@prosopo/puzzle-assets";
import { CaptchaType, type IPuzzleSettings } from "@prosopo/types";
import {
	getPuzzleBackgroundBuffer,
	initPuzzleBackgroundBuffer,
} from "./backgroundBuffer.js";

export interface RenderedPuzzleImages {
	background: string;
	piece: string;
	pieceSize: number;
}

/**
 * Merge zero or more partial-override sources on top of the asset package
 * defaults. Later sources win, matching the tolerance-resolution order in
 * `getPuzzleCaptchaChallenge`: traffic-filter policy overrides the
 * client-record setting, which in turn overrides the built-in default.
 */
export const resolvePuzzleRenderSettings = (
	...overrides: (IPuzzleSettings | undefined)[]
): PuzzleRenderSettings => {
	let resolved: PuzzleRenderSettings = { ...DEFAULT_RENDER_SETTINGS };
	for (const override of overrides) {
		if (!override) continue;
		if (override.decoyCount !== undefined) {
			resolved = { ...resolved, decoyCount: override.decoyCount };
		}
		if (override.decoyEdgeDarkness !== undefined) {
			resolved = { ...resolved, decoyEdgeDarkness: override.decoyEdgeDarkness };
		}
		if (override.decoyBodyBrightness !== undefined) {
			resolved = {
				...resolved,
				decoyBodyBrightness: override.decoyBodyBrightness,
			};
		}
		if (override.holeDarken !== undefined) {
			resolved = { ...resolved, holeDarken: override.holeDarken };
		}
	}
	return resolved;
};

/**
 * Whether this provider can render puzzle imagery right now.
 *
 * Checked where a captchaType is *chosen*, not where the challenge is served:
 * `/captcha/puzzle` cannot answer with an image captcha, because the response
 * shapes are unrelated and the puzzle widget cannot render one. Minting a
 * puzzle session this provider cannot fulfil would strand the user on
 * INCORRECT_CAPTCHA_TYPE, so the decision has to happen before the session is
 * written. See the two mint sites in frictionlessTasks and buildEscalation.
 */
export const isPuzzleRenderAvailable = (): boolean => {
	// Backgrounds are synthesised in-process, so unlike the detector pool there
	// is no asset that can be missing. The buffer lazily initialises on first
	// use, and generation only fails if the image toolchain itself is broken —
	// which surfaces as a render error, not as unavailability.
	return true;
};

/**
 * Substitute `image` for `puzzle` when this provider cannot render imagery.
 *
 * Call this at every point a session's captchaType is decided, never at the
 * point one is served. Returns other types untouched.
 */
export const downgradePuzzleIfUnavailable = <T extends CaptchaType>(
	captchaType: T,
	logger?: Logger,
): T | CaptchaType.image => {
	if (captchaType !== CaptchaType.puzzle || isPuzzleRenderAvailable()) {
		return captchaType;
	}
	logger?.warn(() => ({
		msg: "Puzzle rendering unavailable - downgrading session to image",
		data: { requested: captchaType, served: CaptchaType.image },
	}));
	return CaptchaType.image;
};

export const renderPuzzleImages = async (
	placement: NotchPlacement,
	settings: PuzzleRenderSettings = DEFAULT_RENDER_SETTINGS,
): Promise<RenderedPuzzleImages> => {
	const buffer = getPuzzleBackgroundBuffer() ?? initPuzzleBackgroundBuffer();
	const background = buffer.take();
	if (!background) {
		throw new Error("puzzle renderer: no background available");
	}

	const rendered = await renderPuzzle(
		background,
		placement,
		DEFAULT_GEOMETRY,
		settings,
	);

	return {
		background: toDataUri(rendered.background),
		piece: toDataUri(rendered.piece),
		pieceSize: rendered.pieceSize,
	};
};
