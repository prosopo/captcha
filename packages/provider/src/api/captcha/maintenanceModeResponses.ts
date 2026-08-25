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

import { randomUUID } from "node:crypto";
import {
	ApiParams,
	type CaptchaResponseBody,
	type CaptchaType,
	type GetAudioCaptchaResponse,
	type GetFrictionlessCaptchaResponse,
	type GetPowCaptchaResponse,
	type GetPuzzleCaptchaResponse,
	POW_SEPARATOR,
	type PoWChallengeId,
	type VerificationResponse,
} from "@prosopo/types";
import {
	renderAudioClip,
	resolveAudioRenderSettings,
} from "../../tasks/audio/audioRenderer.js";
import { renderPuzzleImages } from "../../tasks/puzzle/puzzleRenderer.js";

// Maintenance mode dummies. The matching submit/verify endpoints already
// short-circuit to `verified: true`, so these responses just need to be
// shaped correctly for the client widgets to render and POST a solution.
// No DB or Redis interaction.

const sessionPrefix = (host: string | undefined): string =>
	host ? host.replace(".prosopo.io", "") : "local";

// PoWChallengeId is typed as a 3-part template literal but the runtime
// schema and producers use a 4-part split (timestamp/user/dapp/nonce).
// The cast lines maintenance mode up with the actual runtime shape.
const buildChallenge = (user: string, dapp: string): PoWChallengeId =>
	`${Date.now()}${POW_SEPARATOR}${user}${POW_SEPARATOR}${dapp}${POW_SEPARATOR}0` as PoWChallengeId;

// The score a maintenance-mode verify reports. 0 is the most-human end of the
// scale, so a caller thresholding on it passes — and it matches what the AWS
// verify handler already synthesises when the provider call times out.
export const MAINTENANCE_VERIFY_SCORE = 0;

// Verify-side maintenance dummy, shared by the image / PoW / puzzle verify
// routes. Mirrors what `getVerificationResponse` returns in normal operation
// as closely as is possible without a DB:
//
//   - `status` is the localised "User verified" string, not a bare "ok". A real
//     verify never returns "ok" here, and integrations do match on this field.
//   - `score` is sent unconditionally. Normally it is tier-gated on the client
//     record (`canClientSeeScore`), which lives in Mongo — the thing
//     maintenance mode exists to work without. So Free-tier callers get a field
//     they wouldn't normally see; the alternative is paid-tier integrations
//     that read `score` receiving `undefined` where they expect a number, which
//     inverts any `score < threshold` test into a rejection.
//
// `reason` is failure-only and maintenance always passes, so it never applies.
// `commitmentId` (image) is deliberately absent — no commitment exists to name.
export const buildMaintenanceVerificationResponse = (
	translate: (key: string) => string,
): VerificationResponse => ({
	[ApiParams.status]: translate("API.USER_VERIFIED"),
	[ApiParams.verified]: true,
	[ApiParams.score]: MAINTENANCE_VERIFY_SCORE,
});

export const buildFrictionlessMaintenanceResponse = (
	captchaType: CaptchaType.pow | CaptchaType.image | CaptchaType.puzzle,
	host: string | undefined,
): GetFrictionlessCaptchaResponse => ({
	[ApiParams.captchaType]: captchaType,
	[ApiParams.sessionId]: `${sessionPrefix(host)}-${randomUUID()}`,
	[ApiParams.status]: "ok",
});

export const buildPowMaintenanceResponse = (
	user: string,
	dapp: string,
): GetPowCaptchaResponse => {
	const timestamp = Date.now();
	return {
		[ApiParams.status]: "ok",
		[ApiParams.challenge]: buildChallenge(user, dapp),
		[ApiParams.difficulty]: 1,
		[ApiParams.timestamp]: timestamp.toString(),
		[ApiParams.signature]: {
			[ApiParams.provider]: { [ApiParams.challenge]: "" },
		},
	};
};

// Image-only clients still hit this endpoint in maintenance mode (the
// frictionless route returns CaptchaType.pow, but direct image-mode
// integrations don't go through frictionless). Empty captchas matches
// what /submit/image returns in maintenance mode so the surfaces stay
// in sync: nothing to solve, nothing to verify.
export const buildImageMaintenanceResponse = (): CaptchaResponseBody => ({
	[ApiParams.status]: "ok",
	[ApiParams.captchas]: [],
	[ApiParams.requestHash]: "",
	[ApiParams.timestamp]: Date.now().toString(),
	[ApiParams.signature]: {
		[ApiParams.provider]: { [ApiParams.requestHash]: "" },
	},
});

// Rendered for real, because the widget now needs imagery to show anything at
// all — there are no coordinates left to fake a challenge out of. Generation is
// in-process and needs no database, so it works fine while Mongo is away, and
// /submit/puzzle doesn't validate in maintenance mode so any drop resolves.
/**
 * Maintenance-mode audio challenge.
 *
 * Renders a real clip so the widget has something playable and the user
 * sees the normal flow rather than a broken player. The answer is
 * discarded — during maintenance every submission is accepted anyway, so
 * there is nothing to grade against and nothing worth persisting.
 */
export const buildAudioMaintenanceResponse = async (
	user: string,
	dapp: string,
): Promise<GetAudioCaptchaResponse> => {
	const timestamp = Date.now();
	const rendered = renderAudioClip(resolveAudioRenderSettings());
	return {
		[ApiParams.status]: "ok",
		[ApiParams.challenge]: buildChallenge(user, dapp),
		[ApiParams.clip]: rendered.clip,
		[ApiParams.characterCount]: rendered.characterCount,
		[ApiParams.timestamp]: timestamp.toString(),
		[ApiParams.signature]: {
			[ApiParams.provider]: { [ApiParams.challenge]: "" },
		},
	};
};

export const buildPuzzleMaintenanceResponse = async (
	user: string,
	dapp: string,
): Promise<GetPuzzleCaptchaResponse> => {
	const timestamp = Date.now();
	const images = await renderPuzzleImages({ targetX: 200, targetY: 100 });
	return {
		[ApiParams.status]: "ok",
		[ApiParams.challenge]: buildChallenge(user, dapp),
		[ApiParams.background]: images.background,
		[ApiParams.piece]: images.piece,
		[ApiParams.pieceSize]: images.pieceSize,
		[ApiParams.originX]: 60,
		[ApiParams.originY]: 100,
		[ApiParams.timestamp]: timestamp.toString(),
		[ApiParams.signature]: {
			[ApiParams.provider]: { [ApiParams.challenge]: "" },
		},
	};
};
