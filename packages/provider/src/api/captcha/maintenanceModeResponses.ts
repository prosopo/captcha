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
	type GetFrictionlessCaptchaResponse,
	type GetPowCaptchaResponse,
	type GetPuzzleCaptchaResponse,
	POW_SEPARATOR,
	type PoWChallengeId,
} from "@prosopo/types";

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

// Tolerance is intentionally generous: the widget uses it client-side to
// decide whether the drop counts as "complete". Submit doesn't validate
// in maintenance mode, so any drop should resolve cleanly.
export const buildPuzzleMaintenanceResponse = (
	user: string,
	dapp: string,
): GetPuzzleCaptchaResponse => {
	const timestamp = Date.now();
	return {
		[ApiParams.status]: "ok",
		[ApiParams.challenge]: buildChallenge(user, dapp),
		[ApiParams.targetX]: 100,
		[ApiParams.targetY]: 100,
		[ApiParams.originX]: 0,
		[ApiParams.originY]: 0,
		[ApiParams.tolerance]: 1000,
		[ApiParams.timestamp]: timestamp.toString(),
		[ApiParams.signature]: {
			[ApiParams.provider]: { [ApiParams.challenge]: "" },
		},
	};
};
