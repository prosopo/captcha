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
	type ApiResponse,
	type CaptchaType,
	type CompositeIpAddress,
	GetPuzzleCaptchaChallengeRequestBody,
	type GetPuzzleCaptchaChallengeRequestBodyTypeOutput,
	type IPInfoResponse,
	type PoWChallengeId,
	type RequestHeaders,
	SimdReadingsStage,
} from "@prosopo/types";
import type { ClientRecord, ProjectedSession } from "@prosopo/types-database";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { AccessRulesStorage } from "@prosopo/user-access-policy";
import { flatten } from "@prosopo/util";
import type { NextFunction, Request, Response } from "express";
import { getCompositeIpAddress } from "../../compositeIpAddress.js";
import type { AugmentedRequest } from "../../express.js";
import type { CaptchaManager } from "../../tasks/captchaManager.js";
import { Tasks } from "../../tasks/index.js";
import { normalizeRequestIp } from "../../utils/normalizeRequestIp.js";
import { getMaintenanceMode } from "../admin/apiToggleMaintenanceModeEndpoint.js";
import {
	getRequestUserScope,
	normalizeHeadersForMatching,
} from "../blacklistRequestInspector.js";
import { recordCaptchaIssueError, recordCaptchaIssued } from "../metrics.js";
import { summariseRequestBody } from "../requestBodySummary.js";
import { isReservedTestSiteKey } from "../testSiteKey.js";
import { validateAddr, validateSiteKey } from "../validateAddress.js";
import {
	type RequestTimeTrafficVerdict,
	applyTrafficFilterAtRequestTime,
} from "./trafficFilterRequestTime.js";

/** What the shared request handling hands a type's challenge issuer. */
export interface ChallengeIssueContext {
	tasks: Tasks;
	user: string;
	dapp: string;
	origin: string;
	clientSettings: ClientRecord;
	sessionRecord: ProjectedSession | undefined;
	trafficVerdict: RequestTimeTrafficVerdict;
	/** Request provenance to persist on the challenge record. */
	provenance: {
		ipAddress: CompositeIpAddress;
		headers: RequestHeaders;
		ja4: string;
		sessionId?: string;
		ipInfo?: IPInfoResponse;
	};
}

type ChallengeResponse = ApiResponse & { challenge: PoWChallengeId };

export interface IssuedChallenge<TResponse> {
	response: TResponse;
	tolerance: number;
}

export interface InteractiveChallengeSpec<TResponse extends ChallengeResponse> {
	captchaType: CaptchaType.puzzle | CaptchaType.iconOrder;
	/** Lower-case type name used in log messages. */
	label: string;
	manager: (tasks: Tasks) => CaptchaManager;
	maintenanceResponse: (user: string, dapp: string) => Promise<TResponse>;
	/** Refuses the request when false, for types a site must opt in to. */
	isEnabled?: (settings: ClientRecord["settings"]) => boolean;
	/** Mints, persists and renders the challenge. */
	issue: (
		context: ChallengeIssueContext,
	) => Promise<IssuedChallenge<TResponse>>;
}

const capitalise = (text: string): string =>
	text.charAt(0).toUpperCase() + text.slice(1);

/** Request handling shared by the challenge endpoints of the interactive types. */
export const interactiveChallengeHandler =
	<TResponse extends ChallengeResponse>(
		env: ProviderEnvironment,
		userAccessRulesStorage: AccessRulesStorage,
		spec: InteractiveChallengeSpec<TResponse>,
	) =>
	async (
		req: Request & AugmentedRequest,
		res: Response,
		next: NextFunction,
	) => {
		const { captchaType, label } = spec;
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
				msg: `Maintenance mode active - returning dummy ${label} challenge`,
				data: { dapp, user, sessionId },
			}));
			return res.json(await spec.maintenanceResponse(user, dapp));
		}

		// Reserved CI test site keys have no client record, so the lookup
		// below would reject them as unregistered. Checked before
		// `new Tasks(env, ...)` for the same reason as maintenance mode: the
		// constructor calls `env.getDb()`.
		if (isReservedTestSiteKey(dapp)) {
			req.logger.warn(() => ({
				msg: `Reserved TEST site key - returning dummy ${label} challenge`,
				data: { dapp, user, sessionId },
			}));
			return res.json(await spec.maintenanceResponse(user, dapp));
		}

		const tasks = new Tasks(env, req.logger);
		const manager = spec.manager(tasks);

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

			if (spec.isEnabled && !spec.isEnabled(clientSettings.settings)) {
				return next(
					new ProsopoApiError("API.INCORRECT_CAPTCHA_TYPE", {
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
				await manager.getPrioritisedAccessPolicies(
					userAccessRulesStorage,
					dapp,
					userScope,
					normalizeHeadersForMatching(req.headers),
				)
			).find((p) => !p.deferToVerify);

			const {
				valid,
				reason,
				sessionId: validSessionId,
			} = await manager.isValidRequest(
				clientSettings,
				captchaType,
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

			// Only `challenge` policies affect the request-time gate, through
			// their tolerance and render overrides. `block` policies are
			// enforced at submit / verify time so the user still receives a
			// captcha and produces a billable interaction.
			const trafficVerdict = applyTrafficFilterAtRequestTime(
				req.ipInfo,
				clientSettings.settings?.trafficFilter,
				req.logger,
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
							msg: `Failed to patch session with SIMD readings on ${label} challenge`,
						}));
					});
			}

			const { response, tolerance } = await spec.issue({
				tasks,
				user,
				dapp,
				origin,
				clientSettings,
				sessionRecord,
				trafficVerdict,
				provenance: {
					ipAddress: getCompositeIpAddress(normalizedIp),
					headers: flatten(req.headers),
					ja4: req.ja4,
					sessionId: validSessionId,
					// Persist the full ipinfo payload — consumers read
					// individual flags off this object instead of separate
					// flat fields.
					ipInfo: req.ipInfo,
				},
			});

			req.logger.info(() => ({
				msg: `${capitalise(label)} captcha challenge issued`,
				data: {
					captchaType,
					challenge: response.challenge,
					tolerance,
					user,
					dapp,
					session: sessionId,
				},
			}));
			res.locals.padBytes = trafficVerdict.padBytes;
			recordCaptchaIssued(captchaType);
			return res.json(response);
		} catch (err) {
			recordCaptchaIssueError(captchaType);
			req.logger.error(() => ({
				err,
				body: summariseRequestBody(req),
				msg: `Error in ${label} captcha challenge request`,
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
