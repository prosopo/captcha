// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import { handleErrors } from "@prosopo/api-express-router";
import { ProsopoApiError } from "@prosopo/common";
import { parseCaptchaAssets } from "@prosopo/datasets";
import {
	ApiParams,
	type Captcha,
	CaptchaRequestBody,
	type CaptchaRequestBodyTypeOutput,
	type CaptchaResponseBody,
	CaptchaSolutionBody,
	type CaptchaSolutionBodyType,
	type CaptchaSolutionResponse,
	CaptchaType,
	ClientApiPaths,
	type DappUserSolutionResult,
	GetFrictionlessCaptchaChallengeRequestBody,
	GetPowCaptchaChallengeRequestBody,
	type GetPowCaptchaChallengeRequestBodyTypeOutput,
	type GetPowCaptchaResponse,
	type PowCaptchaSolutionResponse,
	type ProsopoCaptchaCountConfigSchemaOutput,
	SubmitPowCaptchaSolutionBody,
	type SubmitPowCaptchaSolutionBodyTypeOutput,
} from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import {
	type ResolveAccessPolicy,
	ScopeMatch,
	createAccessPolicyResolver,
} from "@prosopo/user-access-policy";
import { flatten, getIPAddress } from "@prosopo/util";
import express, { type Router } from "express";
import type { ObjectId } from "mongoose";
import { FrictionlessManager } from "../tasks/frictionless/frictionlessTasks.js";
import { Tasks } from "../tasks/tasks.js";
import { validateAddr, validateSiteKey } from "./validateAddress.js";

const DEFAULT_FRICTIONLESS_THRESHOLD = 0.5;

/**
 * Returns a router connected to the database which can interact with the Proposo protocol
 *
 * @return {Router} - A middleware router that can interact with the Prosopo protocol
 * @param {Environment} env - The Prosopo environment
 */
export function prosopoRouter(env: ProviderEnvironment): Router {
	const router = express.Router();

	const userAccessRulesStorage = env.getDb().getUserAccessRulesStorage();

	/**
	 * Provides a Captcha puzzle to a Dapp User
	 * @param {string} datasetId - Provider datasetId
	 * @param {string} userAccount - Dapp User AccountId
	 * @return {Captcha} - The Captcha data
	 */
	router.post(
		ClientApiPaths.GetImageCaptchaChallenge,
		async (req, res, next) => {
			const tasks = new Tasks(env, req.logger);
			let parsed: CaptchaRequestBodyTypeOutput;

			if (!req.ip) {
				return next(
					new ProsopoApiError("API.BAD_REQUEST", {
						context: { code: 400, error: "IP address not found" },
						i18n: req.i18n,
						logger: req.logger,
					}),
				);
			}

			const ipAddress = getIPAddress(req.ip || "");

			try {
				parsed = CaptchaRequestBody.parse(req.body);
			} catch (err) {
				return next(
					new ProsopoApiError("CAPTCHA.PARSE_ERROR", {
						context: { code: 400, error: err },
						i18n: req.i18n,
						logger: req.logger,
					}),
				);
			}

			const { datasetId, user, dapp, sessionId } = parsed;

			validateSiteKey(dapp);
			validateAddr(user);

			try {
				const clientRecord = await tasks.db.getClientRecord(dapp);

				if (!clientRecord) {
					return next(
						new ProsopoApiError("API.SITE_KEY_NOT_REGISTERED", {
							context: { code: 400, siteKey: dapp },
							i18n: req.i18n,
							logger: req.logger,
						}),
					);
				}

				const { valid, reason, frictionlessTokenId } =
					await tasks.imgCaptchaManager.isValidRequest(
						clientRecord,
						CaptchaType.image,
						sessionId,
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

				const userAccessPolicy =
					await tasks.imgCaptchaManager.getPrioritisedAccessPolicies(
						userAccessRulesStorage,
						dapp,
						{
							numericIp: ipAddress.bigInt(),
							userId: user,
							ja4Hash: req.ja4,
							userAgent: req.headers["user-agent"],
						},
					);
				const captchaConfig: ProsopoCaptchaCountConfigSchemaOutput = {
					solved: {
						count:
							userAccessPolicy?.solvedImagesCount ||
							env.config.captchas.solved.count,
					},
					unsolved: {
						count:
							userAccessPolicy?.unsolvedImagesCount ||
							env.config.captchas.unsolved.count,
					},
				};

				const taskData =
					await tasks.imgCaptchaManager.getRandomCaptchasAndRequestHash(
						datasetId,
						user,
						ipAddress,
						captchaConfig,
						clientRecord.settings.imageThreshold ?? 0.8,
						frictionlessTokenId,
					);
				const captchaResponse: CaptchaResponseBody = {
					[ApiParams.status]: "ok",
					[ApiParams.captchas]: taskData.captchas.map((captcha: Captcha) => ({
						...captcha,
						target: req.t(`TARGET.${captcha.target}`),
						items: captcha.items.map((item) =>
							parseCaptchaAssets(item, env.assetsResolver),
						),
					})),
					[ApiParams.requestHash]: taskData.requestHash,
					[ApiParams.timestamp]: taskData.timestamp.toString(),
					[ApiParams.signature]: {
						[ApiParams.provider]: {
							[ApiParams.requestHash]: taskData.signedRequestHash,
						},
					},
				};
				return res.json(captchaResponse);
			} catch (err) {
				req.logger.error(() => ({
					err,
					data: req.params,
					msg: "Error in PoW captcha solution submission",
				}));
				return next(
					new ProsopoApiError("API.BAD_REQUEST", {
						context: {
							error: err,

							code: 500,
							params: req.params,
							context: err,
						},
						i18n: req.i18n,
						logger: req.logger,
					}),
				);
			}
		},
	);

	/**
	 * Receives solved CAPTCHA challenges from the user, stores to database, and checks against solution commitment
	 *
	 * @param {string} userAccount - Dapp User id
	 * @param {string} dappAccount - Dapp Contract AccountId
	 * @param {Captcha[]} captchas - The Captcha solutions
	 * @return {DappUserSolutionResult} - The Captcha solution result and proof
	 */
	router.post(
		ClientApiPaths.SubmitImageCaptchaSolution,
		async (req, res, next) => {
			const tasks = new Tasks(env, req.logger);
			let parsed: CaptchaSolutionBodyType;
			try {
				parsed = CaptchaSolutionBody.parse(req.body);
			} catch (err) {
				return next(
					new ProsopoApiError("CAPTCHA.PARSE_ERROR", {
						context: { code: 400, error: err, body: req.body },
						i18n: req.i18n,
						logger: req.logger,
					}),
				);
			}

			const { user, dapp } = parsed;

			validateSiteKey(dapp);
			validateAddr(user);

			try {
				const clientRecord = await tasks.db.getClientRecord(parsed.dapp);

				if (!clientRecord) {
					return next(
						new ProsopoApiError("API.SITE_KEY_NOT_REGISTERED", {
							context: { code: 400, siteKey: dapp },
							i18n: req.i18n,
							logger: req.logger,
						}),
					);
				}

				// TODO allow the dapp to override the length of time that the request hash is valid for
				const result: DappUserSolutionResult =
					await tasks.imgCaptchaManager.dappUserSolution(
						user,
						dapp,
						parsed[ApiParams.requestHash],
						parsed[ApiParams.captchas],
						parsed[ApiParams.signature].user.timestamp,
						Number.parseInt(parsed[ApiParams.timestamp]),
						parsed[ApiParams.signature].provider.requestHash,
						getIPAddress(req.ip || "").bigInt(),
						flatten(req.headers),
						req.ja4,
					);

				const returnValue: CaptchaSolutionResponse = {
					status: req.i18n.t(
						result.verified ? "API.CAPTCHA_PASSED" : "API.CAPTCHA_FAILED",
					),
					...result,
				};
				return res.json(returnValue);
			} catch (err) {
				req.logger.error(() => ({
					err,
					body: req.body,
					msg: "Error in PoW captcha solution submission",
				}));
				return next(
					new ProsopoApiError("API.BAD_REQUEST", {
						context: {
							code: 500,
							siteKey: req.body.dapp,
							error: err,
						},
						i18n: req.i18n,
						logger: req.logger,
					}),
				);
			}
		},
	);

	/**
	 * Supplies a PoW challenge to a Dapp User
	 *
	 * @param {string} userAccount - User address
	 * @param {string} dappAccount - Dapp address
	 */
	router.post(ClientApiPaths.GetPowCaptchaChallenge, async (req, res, next) => {
		let parsed: GetPowCaptchaChallengeRequestBodyTypeOutput;
		const tasks = new Tasks(env);
		tasks.setLogger(req.logger);

		try {
			parsed = GetPowCaptchaChallengeRequestBody.parse(req.body);
		} catch (err) {
			return next(
				new ProsopoApiError("CAPTCHA.PARSE_ERROR", {
					context: { code: 400, error: err },
					i18n: req.i18n,
					logger: req.logger,
				}),
			);
		}

		const { user, dapp, sessionId } = parsed;

		validateSiteKey(dapp);
		validateAddr(user);

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

			const { valid, reason, frictionlessTokenId } =
				await tasks.powCaptchaManager.isValidRequest(
					clientSettings,
					CaptchaType.pow,
					sessionId,
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

			const challenge = await tasks.powCaptchaManager.getPowCaptchaChallenge(
				user,
				dapp,
				origin,
				clientSettings?.settings?.powDifficulty,
			);

			await tasks.db.storePowCaptchaRecord(
				challenge.challenge,
				{
					requestedAtTimestamp: challenge.requestedAtTimestamp,
					userAccount: user,
					dappAccount: dapp,
				},
				challenge.difficulty,
				challenge.providerSignature,
				getIPAddress(req.ip || "").bigInt(),
				flatten(req.headers),
				req.ja4,
				frictionlessTokenId,
			);

			const getPowCaptchaResponse: GetPowCaptchaResponse = {
				[ApiParams.status]: "ok",
				[ApiParams.challenge]: challenge.challenge,
				[ApiParams.difficulty]: challenge.difficulty,
				[ApiParams.timestamp]: challenge.requestedAtTimestamp.toString(),
				[ApiParams.signature]: {
					[ApiParams.provider]: {
						[ApiParams.challenge]: challenge.providerSignature,
					},
				},
			};

			return res.json(getPowCaptchaResponse);
		} catch (err) {
			req.logger.error(() => ({
				err,
				body: req.body,
				msg: "Error in PoW captcha solution submission",
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
	});

	/**
	 * Verifies a user's PoW solution as being approved or not
	 *
	 * @param {string} challenge - the challenge string
	 * @param {number} difficulty - the difficulty of the challenge
	 * @param {string} signature - the signature of the challenge
	 * @param {string} nonce - the nonce of the challenge
	 * @param {number} verifiedTimeout - the valid length of captcha solution in ms
	 */
	router.post(
		ClientApiPaths.SubmitPowCaptchaSolution,
		async (req, res, next) => {
			let parsed: SubmitPowCaptchaSolutionBodyTypeOutput;
			const tasks = new Tasks(env, req.logger);

			try {
				parsed = SubmitPowCaptchaSolutionBody.parse(req.body);
			} catch (err) {
				return next(
					new ProsopoApiError("CAPTCHA.PARSE_ERROR", {
						context: { code: 400, error: err, body: req.body },
						i18n: req.i18n,
						logger: req.logger,
					}),
				);
			}

			const {
				challenge,
				difficulty,
				signature,
				nonce,
				verifiedTimeout,
				dapp,
				user,
			} = parsed;

			validateSiteKey(dapp);
			validateAddr(user);

			try {
				const clientRecord = await tasks.db.getClientRecord(dapp);

				if (!clientRecord) {
					return next(
						new ProsopoApiError("API.SITE_KEY_NOT_REGISTERED", {
							context: { code: 400, siteKey: dapp },
							i18n: req.i18n,
							logger: req.logger,
						}),
					);
				}

				const verified = await tasks.powCaptchaManager.verifyPowCaptchaSolution(
					challenge,
					difficulty,
					signature.provider.challenge,
					nonce,
					verifiedTimeout,
					signature.user.timestamp,
					getIPAddress(req.ip || ""),
					flatten(req.headers),
				);
				const response: PowCaptchaSolutionResponse = { status: "ok", verified };
				return res.json(response);
			} catch (err) {
				req.logger.error(() => ({
					err,
					body: req.body,
					msg: "Error in PoW captcha solution submission",
				}));
				return next(
					new ProsopoApiError("API.BAD_REQUEST", {
						context: {
							code: 500,
							siteKey: req.body.dapp,
							error: err,
						},
						i18n: req.i18n,
						logger: req.logger,
					}),
				);
			}
		},
	);

	/**
	 * Gets a frictionless captcha challenge
	 */
	router.post(
		ClientApiPaths.GetFrictionlessCaptchaChallenge,
		async (req, res, next) => {
			try {
				const tasks = new Tasks(env, req.logger);
				const { token, dapp, user } =
					GetFrictionlessCaptchaChallengeRequestBody.parse(req.body);

				// Check if the token has already been used
				const existingToken =
					await tasks.db.getFrictionlessTokenRecordByToken(token);

				if (existingToken) {
					req.logger.info(() => ({
						token: existingToken,
						msg: "Token has already been used",
					}));
					return res.json(
						await tasks.frictionlessManager.sendImageCaptcha(
							existingToken._id as ObjectId,
						),
					);
				}

				const lScore = tasks.frictionlessManager.checkLangRules(
					req.headers["accept-language"] || "",
				);

				const { baseBotScore, timestamp } =
					await tasks.frictionlessManager.decryptPayload(token);

				const botScore = baseBotScore + lScore;

				const clientRecord = await tasks.db.getClientRecord(dapp);

				if (!clientRecord) {
					return next(
						new ProsopoApiError("API.SITE_KEY_NOT_REGISTERED", {
							context: { code: 400, siteKey: dapp },
							i18n: req.i18n,
							logger: req.logger,
						}),
					);
				}

				const { valid, reason } =
					await tasks.frictionlessManager.isValidRequest(
						clientRecord,
						CaptchaType.frictionless,
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

				const botThreshold =
					clientRecord.settings?.frictionlessThreshold ||
					DEFAULT_FRICTIONLESS_THRESHOLD;

				// Store the token
				const tokenId = await tasks.db.storeFrictionlessTokenRecord({
					token,
					score: botScore,
					threshold: botThreshold,
					scoreComponents: {
						baseScore: baseBotScore,
						...(lScore && { lScore }),
					},
				});

				// If the timestamp is older than 10 minutes, send an image captcha
				if (FrictionlessManager.timestampTooOld(timestamp)) {
					await tasks.frictionlessManager.scoreIncreaseTimestamp(
						timestamp,
						baseBotScore,
						botScore,
						tokenId,
					);
					return res.json(
						await tasks.frictionlessManager.sendImageCaptcha(tokenId),
					);
				}

				// Check if the IP address is blocked
				const ipAddress = getIPAddress(req.ip || "");

				const resolveAccessPolicy = createAccessPolicyResolver(
					userAccessRulesStorage,
					req.logger,
				);
				const accessPolicy = await resolveAccessPolicy({
					policyScope: {
						clientId: dapp,
					},
					policyScopeMatch: ScopeMatch.Greedy,
					userScope: {
						userId: user,
						ja4Hash: req.ja4,
						numericIp: ipAddress.bigInt(),
					},
					userScopeMatch: ScopeMatch.Greedy,
				});

				// Get access policies in order of priority
				const accessPolicies = await Promise.all([
					resolveAccessPolicy({
						userScope: {
							userId: user,
							ja4Hash: req.ja4,
							numericIp: ipAddress.bigInt(),
						},
						userScopeMatch: ScopeMatch.Exact,
					}),
					resolveAccessPolicy({
						policyScope: {
							clientId: dapp,
						},
						policyScopeMatch: ScopeMatch.Exact,
						userScope: {
							userId: user,
							ja4Hash: req.ja4,
							numericIp: ipAddress.bigInt(),
						},
						userScopeMatch: ScopeMatch.Exact,
					}),
					resolveAccessPolicy({
						policyScope: {
							clientId: dapp,
						},
						policyScopeMatch: ScopeMatch.Exact,
						userScope: {
							ja4Hash: req.ja4,
							numericIp: ipAddress.bigInt(),
						},
						userScopeMatch: ScopeMatch.Exact,
					}),
				]);

				// If the user or IP address has an image captcha config defined, send an image captcha
				if (
					accessPolicy?.solvedImagesCount ||
					accessPolicy?.unsolvedImagesCount
				) {
					await tasks.frictionlessManager.scoreIncreaseAccessPolicy(
						accessPolicy,
						baseBotScore,
						botScore,
						tokenId,
					);
					return res.json(
						await tasks.frictionlessManager.sendImageCaptcha(tokenId),
					);
				}

				// If the bot score is greater than the threshold, send an image captcha
				if (Number(botScore) > botThreshold) {
					req.logger.info(() => ({
						message: "Bot score is greater than threshold",
						data: {
							botScore,
							botThreshold,
							tokenId,
						},
					}));
					return res.json(
						await tasks.frictionlessManager.sendImageCaptcha(tokenId),
					);
				}

				// Otherwise, send a PoW captcha
				return res.json(
					await tasks.frictionlessManager.sendPowCaptcha(tokenId),
				);
			} catch (err) {
				req.logger.error(() => ({
					err,
					msg: "Error in frictionless captcha challenge",
				}));
				return next(
					new ProsopoApiError("API.BAD_REQUEST", {
						context: { code: 400, error: err },
						i18n: req.i18n,
						logger: req.logger,
					}),
				);
			}
		},
	);

	// Your error handler should always be at the end of your application stack. Apparently it means not only after all
	// app.use() but also after all your app.get() and app.post() calls.
	// https://stackoverflow.com/a/62358794/1178971
	router.use(handleErrors);

	return router;
}
