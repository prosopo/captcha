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
	CaptchaType,
	type IFrictionlessTypes,
	resolveFrictionlessTypes,
} from "@prosopo/types";
import { isPuzzleRenderAvailable } from "./puzzle/puzzleRenderer.js";

/** The three concrete types a session can actually be minted as. */
export type ConcreteCaptchaType =
	| CaptchaType.pow
	| CaptchaType.image
	| CaptchaType.puzzle;

/**
 * Resolve a requested captcha type against what the site permits and what
 * this provider can render.
 *
 * Call this at every point a session's captchaType is DECIDED, never at the
 * point one is served: `/captcha/puzzle` answers with a puzzle-shaped
 * response and nothing else, so a session minted as a type we cannot fulfil
 * strands the user on INCORRECT_CAPTCHA_TYPE. There are two such mint sites —
 * `sendCaptcha` in frictionlessTasks (which every frictionless path funnels
 * through, after the routing machine has had its say) and `buildEscalation`
 * in submitPoWCaptchaSolution.
 *
 * Because it sits after routing, this covers every upstream selector
 * transitively: the score ladder, the no-measurement gates, access-policy
 * Restrict rules, traffic-filter category policies, routing-machine actions
 * and detector-generated rules.
 *
 * Coercion only ever narrows. A disabled type falls back to the other
 * interactive type if that is permitted, and to PoW otherwise — never the
 * reverse, so this can't hand a user a harder challenge than was asked for.
 */
export const coerceToEnabledCaptchaType = (
	requested: ConcreteCaptchaType,
	frictionlessTypes: Partial<IFrictionlessTypes> | undefined,
	logger?: Logger,
): ConcreteCaptchaType => {
	const types = resolveFrictionlessTypes(frictionlessTypes);

	// A puzzle this provider cannot render is as unavailable as one the site
	// disabled, and has to be treated identically here rather than downgraded
	// separately — a site with image off would otherwise be handed an image.
	const puzzleAllowed = types.puzzle && isPuzzleRenderAvailable();
	const imageAllowed = types.image;

	const resolved = ((): ConcreteCaptchaType => {
		switch (requested) {
			case CaptchaType.pow:
				// Always available: no interaction requirement, and the terminal
				// fallback for the two branches below.
				return CaptchaType.pow;
			case CaptchaType.puzzle:
				if (puzzleAllowed) return CaptchaType.puzzle;
				return imageAllowed ? CaptchaType.image : CaptchaType.pow;
			case CaptchaType.image:
				if (imageAllowed) return CaptchaType.image;
				return puzzleAllowed ? CaptchaType.puzzle : CaptchaType.pow;
		}
	})();

	if (resolved !== requested) {
		logger?.info(() => ({
			msg: "Captcha type coerced to an enabled type",
			data: {
				requested,
				served: resolved,
				imageEnabled: types.image,
				puzzleEnabled: types.puzzle,
				puzzleRenderable: isPuzzleRenderAvailable(),
			},
		}));
	}

	return resolved;
};
