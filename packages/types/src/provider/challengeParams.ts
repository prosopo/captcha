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

import { boolean, discriminatedUnion, literal, number, object } from "zod";
import { CaptchaType } from "../client/captchaType/captchaType.js";

/**
 * The per-challenge tuning a session was created with, as a discriminated
 * union keyed on the challenge type.
 *
 * Session records historically carried `solvedImagesCount`, `powDifficulty`
 * and `blocked` as flat top-level fields regardless of which challenge the
 * session actually served — `solvedImagesCount` and `blocked` are meaningful
 * only for image, `powDifficulty` only for pow, and every writer had to
 * remember to null the irrelevant ones (see `sendCaptcha`). Grouping them
 * under the type they belong to makes "which knobs apply here?" a property of
 * the data rather than a convention.
 *
 * Written alongside the legacy flat fields, not instead of them: readers
 * (portal, audit, the central DB streamer) still consume the flat fields, so
 * this is additive until they migrate and a backfill has run.
 */
export type ChallengeParams =
	| {
			type: CaptchaType.image;
			solvedImagesCount?: number;
			blocked?: boolean;
	  }
	| {
			type: CaptchaType.pow;
			powDifficulty?: number;
	  }
	| {
			type: CaptchaType.puzzle;
			// Pixel tolerance the solution is judged against. Currently unset at
			// session-creation time: the puzzle flow resolves tolerance from the
			// client record when the challenge itself is issued
			// (`getPuzzleCaptchaChallenge`), not when the session is minted.
			// Present so a later change can record the resolved value without
			// another schema migration.
			tolerance?: number;
	  };

export const ChallengeParamsSchema = discriminatedUnion("type", [
	object({
		type: literal(CaptchaType.image),
		solvedImagesCount: number().optional(),
		blocked: boolean().optional(),
	}),
	object({
		type: literal(CaptchaType.pow),
		powDifficulty: number().optional(),
	}),
	object({
		type: literal(CaptchaType.puzzle),
		tolerance: number().optional(),
	}),
]);

/**
 * Build the `challengeParams` for a session from the flat fields its creator
 * already has to hand.
 *
 * Returns `undefined` for `frictionless`, which is a router rather than a
 * challenge and therefore never names a concrete session's challenge type.
 */
export const deriveChallengeParams = (
	captchaType: CaptchaType,
	source: {
		solvedImagesCount?: number;
		powDifficulty?: number;
		blocked?: boolean;
		puzzleTolerance?: number;
	},
): ChallengeParams | undefined => {
	switch (captchaType) {
		case CaptchaType.image:
			return {
				type: CaptchaType.image,
				...(source.solvedImagesCount !== undefined && {
					solvedImagesCount: source.solvedImagesCount,
				}),
				...(source.blocked !== undefined && { blocked: source.blocked }),
			};
		case CaptchaType.pow:
			return {
				type: CaptchaType.pow,
				...(source.powDifficulty !== undefined && {
					powDifficulty: source.powDifficulty,
				}),
			};
		case CaptchaType.puzzle:
			return {
				type: CaptchaType.puzzle,
				...(source.puzzleTolerance !== undefined && {
					tolerance: source.puzzleTolerance,
				}),
			};
		default:
			return undefined;
	}
};
