// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import { validateAddress } from "@polkadot/util-crypto/address";
import { ProsopoApiError } from "@prosopo/common";
import { parseCaptchaAssets } from "@prosopo/datasets";
import {
	ApiParams,
	ApiPaths,
	type Captcha,
	CaptchaRequestBody,
	type CaptchaRequestBodyTypeOutput,
	type CaptchaResponseBody,
	CaptchaSolutionBody,
	type CaptchaSolutionBodyType,
	type CaptchaSolutionResponse,
	CaptchaType,
	type DappUserSolutionResult,
	GetFrictionlessCaptchaChallengeRequestBody,
	GetPowCaptchaChallengeRequestBody,
	type GetPowCaptchaChallengeRequestBodyTypeOutput,
	type GetPowCaptchaResponse,
	type PowCaptchaSolutionResponse,
	SubmitPowCaptchaSolutionBody,
	type SubmitPowCaptchaSolutionBodyTypeOutput,
} from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import { createImageCaptchaConfigResolver } from "@prosopo/user-access-policy";
import { flatten } from "@prosopo/util";
import express, { type Router } from "express";
import type { ObjectId } from "mongoose";
import { getBotScore } from "../tasks/detection/getBotScore.js";
import { Tasks } from "../tasks/tasks.js";
import { getIPAddress } from "../util.js";
import { handleErrors } from "./errorHandler.js";

const DEFAULT_FRICTIONLESS_THRESHOLD = 0.5;
const TEN_MINUTES = 60 * 10 * 1000;

/**
 * Returns a router connected to the database which can interact with the Proposo protocol
 *
 * @return {Router} - A middleware router that can interact with the Prosopo protocol
 * @param {Environment} env - The Prosopo environment
 */
export function prosopoRouter(env: ProviderEnvironment): Router {
	const router = express.Router();
	const tasks = new Tasks(env);

	const userAccessRulesStorage = env.getDb().getUserAccessRulesStorage();
	const imageCaptchaConfigResolver = createImageCaptchaConfigResolver(
		userAccessRulesStorage,
		env.logger,
	);

	/**
	 * Provides a Captcha puzzle to a Dapp User
	 * @param {string} datasetId - Provider datasetId
	 * @param {string} userAccount - Dapp User AccountId
	 * @return {Captcha} - The Captcha data
	 */
	router.post(ApiPaths.GetImageCaptchaChallenge, async (req, res, next) => {
		let parsed: CaptchaRequestBodyTypeOutput;

		if (!req.ip) {
			return next(
				new ProsopoApiError("API.BAD_REQUEST", {
					context: { code: 400, error: "IP address not found" },
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
				}),
			);
		}

		const { datasetId, user, dapp, sessionId } = parsed;

		try {
			validateAddress(dapp, false, 42);
		} catch (err) {
			return next(
				new ProsopoApiError("API.INVALID_SITE_KEY", {
					context: { code: 400, error: err, siteKey: dapp },
				}),
			);
		}

		try {
			validateAddress(user, false, 42);

			const clientRecord = await tasks.db.getClientRecord(dapp);

			if (!clientRecord) {
				return next(
					new ProsopoApiError("API.SITE_KEY_NOT_REGISTERED", {
						context: { code: 400, siteKey: dapp },
					}),
				);
			}

			const captchaConfig = await imageCaptchaConfigResolver.resolveConfig(
				env.config.captchas,
				ipAddress,
				user,
				dapp,
			);
			const clientSettings = await tasks.db.getClientRecord(dapp);

			let score: number | undefined;

			if (sessionId) {
				const sessionRecord = await tasks.db.checkAndRemoveSession(sessionId);
				if (sessionRecord) {
					const tokenRecord =
						await tasks.db.getFrictionlessTokenRecordByTokenId(
							sessionRecord.tokenId,
						);
					// there should be a token record. Remove any lScore before storing downstream
					score = tokenRecord
						? tokenRecord.score - (tokenRecord.lScore || 0)
						: 1;
				}
			} else if (!(clientSettings?.settings?.captchaType === "image")) {
				// Throw an error if an image captcha has been requested without a session and the client is not configured for image captchas
				return next(
					new ProsopoApiError("API.INCORRECT_CAPTCHA_TYPE", {
						context: { code: 400, siteKey: dapp, user },
					}),
				);
			}

			const taskData =
				await tasks.imgCaptchaManager.getRandomCaptchasAndRequestHash(
					datasetId,
					user,
					ipAddress,
					flatten(req.headers),
					captchaConfig,
					score,
				);
			const captchaResponse: CaptchaResponseBody = {
				[ApiParams.status]: "ok",
				[ApiParams.captchas]: taskData.captchas.map((captcha: Captcha) => ({
					...captcha,
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
			tasks.logger.error({ err, params: req.params });
			return next(
				new ProsopoApiError("API.BAD_REQUEST", {
					context: {
						error: err,
						code: 500,
						params: req.params,
					},
				}),
			);
		}
	});

	/**
	 * Receives solved CAPTCHA challenges from the user, stores to database, and checks against solution commitment
	 *
	 * @param {string} userAccount - Dapp User id
	 * @param {string} dappAccount - Dapp Contract AccountId
	 * @param {Captcha[]} captchas - The Captcha solutions
	 * @return {DappUserSolutionResult} - The Captcha solution result and proof
	 */
	router.post(ApiPaths.SubmitImageCaptchaSolution, async (req, res, next) => {
		let parsed: CaptchaSolutionBodyType;
		try {
			parsed = CaptchaSolutionBody.parse(req.body);
		} catch (err) {
			return next(
				new ProsopoApiError("CAPTCHA.PARSE_ERROR", {
					context: { code: 400, error: err, body: req.body },
				}),
			);
		}

		const { user, dapp } = parsed;

		try {
			validateAddress(dapp, false, 42);
		} catch (err) {
			return next(
				new ProsopoApiError("API.INVALID_SITE_KEY", {
					context: { code: 400, error: err, siteKey: dapp },
				}),
			);
		}

		try {
			validateAddress(user, false, 42);

			const clientRecord = await tasks.db.getClientRecord(parsed.dapp);

			if (!clientRecord) {
				return next(
					new ProsopoApiError("API.SITE_KEY_NOT_REGISTERED", {
						context: { code: 400, siteKey: dapp },
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
				);

			const returnValue: CaptchaSolutionResponse = {
				status: req.i18n.t(
					result.verified ? "API.CAPTCHA_PASSED" : "API.CAPTCHA_FAILED",
				),
				...result,
			};
			return res.json(returnValue);
		} catch (err) {
			tasks.logger.error({ err, body: req.body });
			return next(
				new ProsopoApiError("API.BAD_REQUEST", {
					context: { code: 500, siteKey: req.body.dapp },
				}),
			);
		}
	});

	/**
	 * Supplies a PoW challenge to a Dapp User
	 *
	 * @param {string} userAccount - User address
	 * @param {string} dappAccount - Dapp address
	 */
	router.post(ApiPaths.GetPowCaptchaChallenge, async (req, res, next) => {
		let parsed: GetPowCaptchaChallengeRequestBodyTypeOutput;

		try {
			parsed = GetPowCaptchaChallengeRequestBody.parse(req.body);
		} catch (err) {
			return next(
				new ProsopoApiError("CAPTCHA.PARSE_ERROR", {
					context: { code: 400, error: err },
				}),
			);
		}

		const { user, dapp, sessionId } = parsed;
		try {
			validateAddress(dapp, false, 42);
		} catch (err) {
			return next(
				new ProsopoApiError("API.INVALID_SITE_KEY", {
					context: { code: 400, error: err, siteKey: dapp },
				}),
			);
		}

		try {
			validateAddress(user, false, 42);

			const clientSettings = await tasks.db.getClientRecord(dapp);
			const clientRecord = await tasks.db.getClientRecord(dapp);

			if (!clientRecord) {
				return next(
					new ProsopoApiError("API.SITE_KEY_NOT_REGISTERED", {
						context: { code: 400, siteKey: dapp },
					}),
				);
			}

			let score: number | undefined;

			if (sessionId) {
				const sessionRecord = await tasks.db.checkAndRemoveSession(sessionId);
				if (
					!sessionRecord ||
					(sessionRecord && sessionRecord.captchaType !== CaptchaType.pow)
				) {
					return next(
						new ProsopoApiError("API.BAD_REQUEST", {
							context: {
								error: "Session ID not found",
								code: 400,
								siteKey: dapp,
								user,
							},
						}),
					);
				}
				const tokenRecord = await tasks.db.getFrictionlessTokenRecordByTokenId(
					sessionRecord.tokenId,
				);
				// there should be a token record. Remove any lScore before storing downstream
				score = tokenRecord ? tokenRecord.score - (tokenRecord.lScore || 0) : 1;
			} else if (!(clientSettings?.settings?.captchaType === "pow")) {
				// Throw an error if a pow captcha has been requested without a session and the client is not configured for pow captchas
				return next(
					new ProsopoApiError("API.INCORRECT_CAPTCHA_TYPE", {
						context: { code: 400, siteKey: dapp, user },
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
				score,
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
			tasks.logger.error({ err, body: req.body });
			return next(
				new ProsopoApiError("API.BAD_REQUEST", {
					context: {
						code: 500,
						siteKey: req.body.dapp,
						user: req.body.user,
					},
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
	router.post(ApiPaths.SubmitPowCaptchaSolution, async (req, res, next) => {
		let parsed: SubmitPowCaptchaSolutionBodyTypeOutput;

		try {
			parsed = SubmitPowCaptchaSolutionBody.parse(req.body);
		} catch (err) {
			return next(
				new ProsopoApiError("CAPTCHA.PARSE_ERROR", {
					context: { code: 400, error: err, body: req.body },
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

		try {
			validateAddress(dapp, false, 42);
		} catch (err) {
			return next(
				new ProsopoApiError("API.INVALID_SITE_KEY", {
					context: { code: 400, error: err, siteKey: dapp },
				}),
			);
		}

		try {
			validateAddress(user, false, 42);

			validateAddress(dapp, false, 42);

			const clientRecord = await tasks.db.getClientRecord(dapp);

			if (!clientRecord) {
				return next(
					new ProsopoApiError("API.SITE_KEY_NOT_REGISTERED", {
						context: { code: 400, siteKey: dapp },
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
			tasks.logger.error({ err, body: req.body });
			return next(
				new ProsopoApiError("API.BAD_REQUEST", {
					context: {
						code: 500,
						siteKey: req.body.dapp,
					},
				}),
			);
		}
	});

	/**
	 * Gets a frictionless captcha challenge
	 */
	router.post(
		ApiPaths.GetFrictionlessCaptchaChallenge,
		async (req, res, next) => {
			try {
				const { token, dapp, user } =
					GetFrictionlessCaptchaChallengeRequestBody.parse(req.body);

				// Check if the token has already been used
				const existingToken =
					await tasks.db.getFrictionlessTokenRecordByToken(token);

				if (existingToken) {
					tasks.logger.info("Token has already been used");
					return res.json(
						await tasks.frictionlessManager.sendImageCaptcha(
							existingToken._id as ObjectId,
						),
					);
				}

				const lScore = tasks.frictionlessManager.checkLangRules(
					req.headers["accept-language"] || "",
				);

				const { baseBotScore, timestamp } = await getBotScore(token);

				const botScore = baseBotScore + lScore;

				const clientConfig = await tasks.db.getClientRecord(dapp);
				const botThreshold =
					clientConfig?.settings?.frictionlessThreshold ||
					DEFAULT_FRICTIONLESS_THRESHOLD;

				// Store the token
				const tokenId = await tasks.db.storeFrictionlessTokenRecord({
					token,
					score: botScore,
					threshold: botThreshold,
					...(lScore && { lScore }),
				});

				// If the timestamp is older than 10 minutes, send an image captcha
				if (timestamp < Date.now() - TEN_MINUTES) {
					tasks.logger.info(
						"Timestamp is older than 10 minutes",
						new Date(timestamp),
					);
					return res.json(
						await tasks.frictionlessManager.sendImageCaptcha(tokenId),
					);
				}

				// Check if the IP address is blocked
				const ipAddress = getIPAddress(req.ip || "");

				const imageCaptchaConfigDefined =
					await imageCaptchaConfigResolver.isConfigDefined(
						dapp,
						ipAddress,
						user,
					);

				if (imageCaptchaConfigDefined)
					return res.json(tasks.frictionlessManager.sendImageCaptcha(tokenId));

				// If the bot score is greater than the threshold, send an image captcha
				if (Number(botScore) > botThreshold) {
					return res.json(
						await tasks.frictionlessManager.sendImageCaptcha(tokenId),
					);
				}

				const response =
					await tasks.frictionlessManager.sendPowCaptcha(tokenId);

				return res.json(response);
			} catch (err) {
				tasks.logger.error("Error in frictionless captcha challenge:", err);
				return next(
					new ProsopoApiError("API.BAD_REQUEST", {
						context: { code: 400, error: err },
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
