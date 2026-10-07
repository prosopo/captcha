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
import { DEFAULT_GEOMETRY } from "@prosopo/puzzle-assets";
import {
	ApiParams,
	CaptchaType,
	type GetPuzzleCaptchaResponse,
} from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { AccessRulesStorage } from "@prosopo/user-access-policy";
import {
	renderPuzzleImages,
	resolvePuzzlePieceSize,
	resolvePuzzleRenderSettings,
} from "../../tasks/puzzle/puzzleRenderer.js";
import { isPuzzleImageSwitchAvailable } from "./getFrictionlessCaptchaChallenge/constants.js";
import {
	type ChallengeIssueContext,
	type IssuedChallenge,
	interactiveChallengeHandler,
} from "./interactiveCaptchaChallenge.js";
import { buildPuzzleMaintenanceResponse } from "./maintenanceModeResponses.js";

const issuePuzzleChallenge = async ({
	tasks,
	user,
	dapp,
	origin,
	clientSettings,
	sessionRecord,
	trafficVerdict,
	provenance,
}: ChallengeIssueContext): Promise<
	IssuedChallenge<GetPuzzleCaptchaResponse>
> => {
	const challengeVerdict =
		trafficVerdict.kind === "challenge" ? trafficVerdict : undefined;

	// Overrides a routing machine asked for, persisted on the session.
	// The router runs only where the live trafficFilter verdict did
	// NOT match (it evaluates after the request-time filter), so in
	// practice these are mutually exclusive; the live verdict wins if
	// both are somehow present.
	const tolerance =
		challengeVerdict?.puzzleTolerance ??
		sessionRecord?.puzzleTolerance ??
		clientSettings?.settings?.puzzleTolerance;

	// Resolve per-render puzzle tunables the same way as tolerance:
	// asset defaults <- clientSettings.puzzle <- trafficFilter category
	// puzzle override. Missing sub-fields fall through to the layer
	// beneath, so partial overrides work as expected.
	const routedPuzzleSettings =
		challengeVerdict?.puzzleSettings ?? sessionRecord?.puzzle;
	const effectivePuzzleSettings = resolvePuzzleRenderSettings(
		clientSettings?.settings?.puzzle,
		routedPuzzleSettings,
	);
	// Piece size is drawn per-challenge from the effective scale
	// range so a solver can't hard-code the expected silhouette
	// scale. Uses the same layered client / traffic-filter override
	// order as the render settings above.
	const effectivePieceSize = resolvePuzzlePieceSize(
		clientSettings?.settings?.puzzle,
		routedPuzzleSettings,
	);
	const challenge = await tasks.puzzleCaptchaManager.getPuzzleCaptchaChallenge(
		user,
		dapp,
		origin,
		tolerance,
	);

	await tasks.db.storePuzzleCaptchaRecord(
		challenge.challenge,
		{
			requestedAtTimestamp: challenge.requestedAtTimestamp,
			userAccount: user,
			dappAccount: dapp,
		},
		challenge.targetX,
		challenge.targetY,
		challenge.originX,
		challenge.originY,
		challenge.tolerance,
		challenge.providerSignature,
		provenance.ipAddress,
		provenance.headers,
		provenance.ja4,
		provenance.sessionId,
		provenance.ipInfo,
	);

	// Render AFTER the record is stored: the target must be durable
	// before it is expressed in pixels, so a crash between the two
	// cannot leave a challenge the user can see but the server cannot
	// score. Imagery is derived from the same target that was persisted.
	const images = await renderPuzzleImages(
		{
			targetX: challenge.targetX,
			targetY: challenge.targetY,
		},
		effectivePuzzleSettings,
		effectivePieceSize,
	);

	// A second write rather than an argument to storePuzzleCaptchaRecord: the
	// sampled piece size and the seeds only exist once the render has run, and
	// the record has to be durable before it. Losing this diagnostic must not
	// cost the user the solve, so a failure is only logged.
	await tasks.db
		.updatePuzzleCaptchaRecord(challenge.challenge, {
			render: {
				...(sessionRecord?.puzzleLevel !== undefined && {
					level: sessionRecord.puzzleLevel,
				}),
				pieceSize: images.pieceSize,
				geometry: {
					width: DEFAULT_GEOMETRY.width,
					height: DEFAULT_GEOMETRY.height,
					notchSize: DEFAULT_GEOMETRY.notchSize,
				},
				settings: {
					decoyCount: effectivePuzzleSettings.decoyCount,
					decoyEdgeDarkness: effectivePuzzleSettings.decoyEdgeDarkness,
					decoyBodyBrightness: effectivePuzzleSettings.decoyBodyBrightness,
					holeDarken: effectivePuzzleSettings.holeDarken,
					decoyHoleDarken: effectivePuzzleSettings.decoyHoleDarken,
				},
				backgroundSeed: images.backgroundSeed,
				renderSeed: images.renderSeed,
			},
		})
		.catch((updateErr: unknown) => {
			tasks.logger.warn(() => ({
				err: updateErr,
				msg: "Failed to patch puzzle render inputs onto the challenge record",
			}));
		});

	return {
		logData: { tolerance: challenge.tolerance },
		response: {
			[ApiParams.status]: "ok",
			[ApiParams.challenge]: challenge.challenge,
			[ApiParams.background]: images.background,
			[ApiParams.piece]: images.piece,
			[ApiParams.pieceSize]: images.pieceSize,
			[ApiParams.originX]: challenge.originX,
			[ApiParams.originY]: challenge.originY,
			[ApiParams.timestamp]: challenge.requestedAtTimestamp.toString(),
			[ApiParams.signature]: {
				[ApiParams.provider]: {
					[ApiParams.challenge]: challenge.providerSignature,
				},
			},
			...(isPuzzleImageSwitchAvailable(clientSettings?.settings ?? {}) && {
				[ApiParams.imageSwitchAvailable]: true,
			}),
		},
	};
};

export default (
	env: ProviderEnvironment,
	userAccessRulesStorage: AccessRulesStorage,
) =>
	interactiveChallengeHandler(env, userAccessRulesStorage, {
		captchaType: CaptchaType.puzzle,
		label: "puzzle",
		manager: (tasks) => tasks.puzzleCaptchaManager,
		maintenanceResponse: buildPuzzleMaintenanceResponse,
		issue: issuePuzzleChallenge,
	});
