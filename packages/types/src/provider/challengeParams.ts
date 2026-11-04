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

import { discriminatedUnion, literal, number, object } from "zod";
import {
	CaptchaType,
	type ConcreteCaptchaType,
} from "../client/captchaType/captchaType.js";

/**
 * The per-challenge tuning a session was created with, keyed on the type it
 * was minted as.
 *
 * Sessions carry these knobs as flat top-level fields whatever type they
 * serve, so every writer has to remember which ones to clear. Grouping them
 * under their type makes that a property of the data. Written alongside the
 * flat fields, which stay the source of truth until readers migrate.
 */
export type ChallengeParams =
	| { type: CaptchaType.image; solvedImagesCount?: number }
	| { type: CaptchaType.pow; powDifficulty?: number }
	| { type: CaptchaType.puzzle; tolerance?: number }
	| { type: CaptchaType.iconOrder; tolerance?: number };

export const ChallengeParamsSchema = discriminatedUnion("type", [
	object({
		type: literal(CaptchaType.image),
		solvedImagesCount: number().optional(),
	}),
	object({
		type: literal(CaptchaType.pow),
		powDifficulty: number().optional(),
	}),
	object({
		type: literal(CaptchaType.puzzle),
		tolerance: number().optional(),
	}),
	object({
		type: literal(CaptchaType.iconOrder),
		tolerance: number().optional(),
	}),
]);

export const deriveChallengeParams = (
	captchaType: ConcreteCaptchaType,
	source: {
		solvedImagesCount?: number;
		powDifficulty?: number;
		puzzleTolerance?: number;
		iconOrderTolerance?: number;
	},
): ChallengeParams => {
	switch (captchaType) {
		case CaptchaType.image:
			return {
				type: captchaType,
				...(source.solvedImagesCount !== undefined && {
					solvedImagesCount: source.solvedImagesCount,
				}),
			};
		case CaptchaType.pow:
			return {
				type: captchaType,
				...(source.powDifficulty !== undefined && {
					powDifficulty: source.powDifficulty,
				}),
			};
		case CaptchaType.puzzle:
			return {
				type: captchaType,
				...(source.puzzleTolerance !== undefined && {
					tolerance: source.puzzleTolerance,
				}),
			};
		case CaptchaType.iconOrder:
			return {
				type: captchaType,
				...(source.iconOrderTolerance !== undefined && {
					tolerance: source.iconOrderTolerance,
				}),
			};
	}
};
