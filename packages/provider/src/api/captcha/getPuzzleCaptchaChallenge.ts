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
import { ProsopoApiError } from "@prosopo/common";
import {
	ApiParams,
	CaptchaType,
	GetPuzzleCaptchaChallengeRequestBody,
	type GetPuzzleCaptchaChallengeRequestBodyTypeOutput,
	type GetPuzzleCaptchaResponse,
	SimdReadingsStage,
} from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { AccessRulesStorage } from "@prosopo/user-access-policy";
import { flatten } from "@prosopo/util";
import type { NextFunction, Request, Response } from "express";
import { getCompositeIpAddress } from "../../compositeIpAddress.js";
import type { AugmentedRequest } from "../../express.js";
import { Tasks } from "../../tasks/index.js";
import {
	renderPuzzleImages,
	resolvePuzzlePieceSize,
	resolvePuzzleRenderSettings,
} from "../../tasks/puzzle/puzzleRenderer.js";
import { normalizeRequestIp } from "../../utils/normalizeRequestIp.js";
import { getMaintenanceMode } from "../admin/apiToggleMaintenanceModeEndpoint.js";
import { getRequestUserScope } from "../blacklistRequestInspector.js";
import { recordCaptchaIssueError, recordCaptchaIssued } from "../metrics.js";
import { isReservedTestSiteKey } from "../testSiteKey.js";
import { validateAddr, validateSiteKey } from "../validateAddress.js";
import { buildPuzzleMaintenanceResponse } from "./maintenanceModeResponses.js";
import { applyTrafficFilterAtRequestTime } from "./trafficFilterRequestTime.js";

export default (
	env: ProviderEnvironment,
	userAccessRulesStorage: AccessRulesStorage,
) =>
	async (
		req: Request & AugmentedRequest,
		res: Response,
		next: NextFunction,
	) => {
		let parsed: GetPuzzleCaptchaChallengeRequestBodyTypeOutput;

		try {
			parsed = GetPuzzleCaptchaChallengeRequestBody.parse(req.body);
		} catch (err) {
			return next(
				new ProsopoApiError("CAPTCHA.PARSE_ERROR", {
					context: { code: 400, error: err },
					i18n: req.i18n,
					logger: req.logger,
				}),
			);
		}

		const { user, dapp, sessionId, simdReadings } = parsed;

		validateSiteKey(dapp);
		validateAddr(user);

		// Maintenance-mode short-circuit must run before `new Tasks(env, ...)`
		// because the Tasks constructor calls `env.getDb()`, which throws when
		// `env.db` is undefined (the maintenance-mode case).
		if (getMaintenanceMode()) {
			req.logger.info(() => ({
				msg: "Maintenance mode active - returning dummy puzzle challenge",
				data: { dapp, user, sessionId },
			}));
			return res.json(await buildPuzzleMaintenanceResponse(user, dapp));
		}

		// Reserved CI test site keys have no client record, so the lookup
		// below would reject them as unregistered. Checked before
		// `new Tasks(env, ...)` for the same reason as maintenance mode: the
		// constructor calls `env.getDb()`.
		if (isReservedTestSiteKey(dapp)) {
			req.logger.warn(() => ({
				msg: "Reserved TEST site key - returning dummy puzzle challenge",
				data: { dapp, user, sessionId },
			}));
			return res.json(await buildPuzzleMaintenanceResponse(user, dapp));
		}

		const tasks = new Tasks(env, req.logger);

		try {
			const clientSettings = await tasks.db.getClientRecord(dapp);

			if (!clientSettings) {
				return next(
					new ProsopoApiError("API.SITE_KEY_NOT_REGISTERED", {
						context: { code: 400, siteKey: dapp },
						i18n: req.i18n,
						logger: req.logger,
					}),
				);
			}

			const normalizedIp = normalizeRequestIp(req.ip, req.logger);
			if (!normalizedIp) {
				req.logger.warn(() => ({
					msg: "Request missing IP; geoblocking will be skipped",
				}));
			}

			// Get country code for geoblocking from middleware-provided IP info
			const countryCode =
				req.ipInfo && "isValid" in req.ipInfo && req.ipInfo.isValid
					? req.ipInfo.countryCode
					: undefined;
			const asn =
				req.ipInfo && "isValid" in req.ipInfo && req.ipInfo.isValid
					? req.ipInfo.asnNumber
					: undefined;

			// Pull decryptedHeadHash off the frictionless session so
			// headHash-scoped access rules can match at challenge time.
			const sessionRecord = sessionId
				? await tasks.db.getSessionRecordBySessionId(sessionId)
				: undefined;

			const userScope = getRequestUserScope(
				flatten(req.headers),
				req.ja4,
				normalizedIp,
				user,
				sessionRecord?.decryptedHeadHash,
				undefined, // coords
				countryCode,
				asn,
			);
			// Skip deferToVerify policies at request time — see
			// getImageCaptchaChallenge for the full rationale.
			const userAccessPolicy = (
				await tasks.puzzleCaptchaManager.getPrioritisedAccessPolicies(
					userAccessRulesStorage,
					dapp,
					userScope,
				)
			).find((p) => !p.deferToVerify);

			const {
				valid,
				reason,
				sessionId: validSessionId,
			} = await tasks.puzzleCaptchaManager.isValidRequest(
				clientSettings,
				CaptchaType.puzzle,
				env,
				sessionId,
				userAccessPolicy,
				normalizedIp,
			);

			if (!valid) {
				return next(
					new ProsopoApiError(reason || "API.BAD_REQUEST", {
						context: {
							code: 400,
							siteKey: dapp,
							user,
						},
						i18n: req.i18n,
						logger: req.logger,
					}),
				);
			}

			const origin = req.headers.origin;

			if (!origin) {
				return next(
					new ProsopoApiError("API.BAD_REQUEST", {
						context: {
							error: "Origin header not found",
							code: 400,
							siteKey: dapp,
							user,
						},
						i18n: req.i18n,
						logger: req.logger,
					}),
				);
			}

			// Evaluate the site's trafficFilter against the connecting IP.
			// Only `challenge` policies affect the request-time gate — they
			// contribute puzzleTolerance overrides (lower tolerance =
			// stricter accuracy). `block` policies are enforced at submit /
			// verify time so the user still receives a captcha and produces
			// a billable interaction.
			const trafficVerdict = applyTrafficFilterAtRequestTime(
				req.ipInfo,
				clientSettings.settings?.trafficFilter,
				req.logger,
			);
			const trafficPuzzleTolerance =
				trafficVerdict.kind === "challenge"
					? trafficVerdict.puzzleTolerance
					: undefined;

			// Overrides a routing machine asked for, persisted on the session.
			// The router runs only where the live trafficFilter verdict did
			// NOT match (it evaluates after the request-time filter), so in
			// practice these are mutually exclusive; the live verdict wins if
			// both are somehow present.
			const tolerance =
				trafficPuzzleTolerance ??
				sessionRecord?.puzzleTolerance ??
				clientSettings?.settings?.puzzleTolerance;

			// Resolve per-render puzzle tunables the same way as tolerance:
			// asset defaults <- clientSettings.puzzle <- trafficFilter category
			// puzzle override. Missing sub-fields fall through to the layer
			// beneath, so partial overrides work as expected.
			const trafficPuzzleSettings =
				trafficVerdict.kind === "challenge"
					? trafficVerdict.puzzleSettings
					: undefined;
			const routedPuzzleSettings =
				trafficPuzzleSettings ?? sessionRecord?.puzzle;
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
			const challenge =
				await tasks.puzzleCaptchaManager.getPuzzleCaptchaChallenge(
					user,
					dapp,
					origin,
					tolerance,
				);

			if (validSessionId && simdReadings) {
				await tasks.frictionlessManager
					.decryptAndAttachSimdReadingsIfAbsent(
						validSessionId,
						simdReadings,
						SimdReadingsStage.challenge,
					)
					.catch((updateErr) => {
						req.logger.warn(() => ({
							err: updateErr,
							msg: "Failed to patch session with SIMD readings on puzzle challenge",
						}));
					});
			}

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
				getCompositeIpAddress(normalizedIp),
				flatten(req.headers),
				req.ja4,
				validSessionId,
				// Persist the full ipinfo payload — consumers read
				// individual flags off this object instead of separate
				// flat fields.
				req.ipInfo,
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

			const getPuzzleCaptchaResponse: GetPuzzleCaptchaResponse = {
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
			};

			req.logger.info(() => ({
				msg: "Puzzle captcha challenge issued",
				data: {
					captchaType: CaptchaType.puzzle,
					challenge: challenge.challenge,
					tolerance: challenge.tolerance,
					user,
					dapp,
					session: sessionId,
				},
			}));
			recordCaptchaIssued(CaptchaType.puzzle);
			return res.json(getPuzzleCaptchaResponse);
		} catch (err) {
			recordCaptchaIssueError(CaptchaType.puzzle);
			req.logger.error(() => ({
				err,
				body: req.body,
				msg: "Error in puzzle captcha challenge request",
			}));
			return next(
				new ProsopoApiError("API.BAD_REQUEST", {
					context: {
						code: 500,
						siteKey: req.body.dapp,
						user: req.body.user,
						error: err,
					},
					i18n: req.i18n,
					logger: req.logger,
				}),
			);
		}
	};
