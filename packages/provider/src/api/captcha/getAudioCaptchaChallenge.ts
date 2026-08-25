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
	GetAudioCaptchaChallengeRequestBody,
	type GetAudioCaptchaChallengeRequestBodyTypeOutput,
	type GetAudioCaptchaResponse,
	SimdReadingsStage,
} from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { AccessRulesStorage } from "@prosopo/user-access-policy";
import { flatten } from "@prosopo/util";
import type { NextFunction, Request, Response } from "express";
import { getCompositeIpAddress } from "../../compositeIpAddress.js";
import type { AugmentedRequest } from "../../express.js";
import { Tasks } from "../../tasks/index.js";
import { resolveAudioRenderSettings } from "../../tasks/audio/audioRenderer.js";
import { normalizeRequestIp } from "../../utils/normalizeRequestIp.js";
import { getMaintenanceMode } from "../admin/apiToggleMaintenanceModeEndpoint.js";
import { getRequestUserScope } from "../blacklistRequestInspector.js";
import { recordCaptchaIssueError, recordCaptchaIssued } from "../metrics.js";
import { validateAddr, validateSiteKey } from "../validateAddress.js";
import { buildAudioMaintenanceResponse } from "./maintenanceModeResponses.js";
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
		let parsed: GetAudioCaptchaChallengeRequestBodyTypeOutput;

		try {
			parsed = GetAudioCaptchaChallengeRequestBody.parse(req.body);
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
				msg: "Maintenance mode active - returning dummy audio challenge",
				data: { dapp, user, sessionId },
			}));
			return res.json(await buildAudioMaintenanceResponse(user, dapp));
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
				await tasks.audioCaptchaManager.getPrioritisedAccessPolicies(
					userAccessRulesStorage,
					dapp,
					userScope,
				)
			).find((p) => !p.deferToVerify);

			const {
				valid,
				reason,
				sessionId: validSessionId,
			} = await tasks.audioCaptchaManager.isValidRequest(
				clientSettings,
				CaptchaType.audio,
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
			// contribute per-render audio overrides. `block` policies are
			// enforced at submit / verify time so the user still receives a
			// captcha and produces a billable interaction.
			const trafficVerdict = applyTrafficFilterAtRequestTime(
				req.ipInfo,
				clientSettings.settings?.trafficFilter,
				req.logger,
			);

			// Resolve per-render audio tunables: asset defaults <-
			// clientSettings.audio <- trafficFilter category audio override.
			// Missing sub-fields fall through to the layer beneath, so
			// partial overrides work as expected.
			const trafficAudioSettings =
				trafficVerdict.kind === "challenge"
					? trafficVerdict.audioSettings
					: undefined;
			const effectiveAudioSettings = resolveAudioRenderSettings(
				clientSettings?.settings?.audio,
				trafficAudioSettings,
			);

			// Synthesis happens here, BEFORE the record is stored, because
			// the answer is produced by the renderer rather than chosen up
			// front — unlike the puzzle, where the target exists before the
			// imagery. Storing the record is therefore what makes the
			// challenge real: if the write fails, nothing is returned and
			// the clip is discarded unheard.
			const challenge =
				await tasks.audioCaptchaManager.getAudioCaptchaChallenge(
					user,
					dapp,
					origin,
					effectiveAudioSettings,
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
							msg: "Failed to patch session with SIMD readings on audio challenge",
						}));
					});
			}

			await tasks.db.storeAudioCaptchaRecord(
				challenge.challenge,
				{
					requestedAtTimestamp: challenge.requestedAtTimestamp,
					userAccount: user,
					dappAccount: dapp,
				},
				challenge.answer,
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

			// `challenge.answer` is deliberately absent from this object,
			// and `GetAudioCaptchaResponse` has no field to hold it. The
			// puzzle captcha used to return its target coordinates here,
			// which let any caller echo them back and pass without
			// rendering anything; the transcript is the same secret in a
			// different medium.
			const getAudioCaptchaResponse: GetAudioCaptchaResponse = {
				[ApiParams.status]: "ok",
				[ApiParams.challenge]: challenge.challenge,
				[ApiParams.clip]: challenge.clip,
				[ApiParams.characterCount]: challenge.characterCount,
				[ApiParams.timestamp]: challenge.requestedAtTimestamp.toString(),
				[ApiParams.signature]: {
					[ApiParams.provider]: {
						[ApiParams.challenge]: challenge.providerSignature,
					},
				},
			};

			req.logger.info(() => ({
				msg: "Audio captcha challenge issued",
				data: {
					captchaType: CaptchaType.audio,
					challenge: challenge.challenge,
					// Length and duration only. The transcript never goes
					// near a log line — provider logs ship off-box.
					characterCount: challenge.characterCount,
					durationMs: challenge.durationMs,
					user,
					dapp,
					session: sessionId,
				},
			}));
			recordCaptchaIssued(CaptchaType.audio);
			return res.json(getAudioCaptchaResponse);
		} catch (err) {
			recordCaptchaIssueError(CaptchaType.audio);
			req.logger.error(() => ({
				err,
				body: req.body,
				msg: "Error in audio captcha challenge request",
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
