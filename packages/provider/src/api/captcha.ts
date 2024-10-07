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
	type CaptchaResponseBody,
	CaptchaSolutionBody,
	type CaptchaSolutionBodyType,
	type CaptchaSolutionResponse,
	type DappUserSolutionResult,
	GetFrictionlessCaptchaChallengeRequestBody,
	GetFrictionlessCaptchaResponse,
	GetPowCaptchaChallengeRequestBody,
	type GetPowCaptchaResponse,
	type PowCaptchaSolutionResponse,
	SubmitPowCaptchaSolutionBody,
	type TGetImageCaptchaChallengePathAndParams,
} from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import { flatten, version } from "@prosopo/util";
import express, { type Router } from "express";
import { getBotScore } from "../tasks/detection/getBotScore.js";
import { Tasks } from "../tasks/tasks.js";
import { handleErrors } from "./errorHandler.js";
import { SessionRecord } from "@prosopo/types-database";
import { v4 as uuidv4 } from 'uuid';

const NO_IP_ADDRESS = "NO_IP_ADDRESS" as const;

/**
 * Returns a router connected to the database which can interact with the Proposo protocol
 *
 * @return {Router} - A middleware router that can interact with the Prosopo protocol
 * @param {Environment} env - The Prosopo environment
 */
export function prosopoRouter(env: ProviderEnvironment): Router {
	const router = express.Router();
	const tasks = new Tasks(env);

	/**
	 * Provides a Captcha puzzle to a Dapp User
	 * @param {string} datasetId - Provider datasetId
	 * @param {string} userAccount - Dapp User AccountId
	 * @return {Captcha} - The Captcha data
	 */
	const GetImageCaptchaChallengePath: TGetImageCaptchaChallengePathAndParams = `${ApiPaths.GetImageCaptchaChallenge}/:${ApiParams.datasetId}/:${ApiParams.user}/:${ApiParams.dapp}`;
	router.get(GetImageCaptchaChallengePath, async (req, res, next) => {
		try {
			const { datasetId, user, dapp } = CaptchaRequestBody.parse(req.params);
			validateAddress(user, false, 42);
			validateAddress(dapp, false, 42);

			const clientRecord = await tasks.db.getClientRecord(dapp);

			if (!clientRecord) {
				return res.json({
					error: req.i18n.t("API.SITE_KEY_NOT_REGISTERED"),
					code: 200,
				});
			}

			const taskData =
				await tasks.imgCaptchaManager.getRandomCaptchasAndRequestHash(
					datasetId,
					user,
					req.ip || NO_IP_ADDRESS,
					flatten(req.headers, ","),
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
			tasks.logger.error(err);
			return next(
				new ProsopoApiError("API.BAD_REQUEST", {
					context: { error: err, code: 400 },
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
					context: { code: 400, error: err },
				}),
			);
		}

		try {
			const clientRecord = await tasks.db.getClientRecord(parsed.dapp);

			if (!clientRecord) {
				return res.json({
					error: req.i18n.t("API.SITE_KEY_NOT_REGISTERED"),
					code: 200,
				});
			}

			// TODO allow the dapp to override the length of time that the request hash is valid for
			const result: DappUserSolutionResult =
				await tasks.imgCaptchaManager.dappUserSolution(
					parsed[ApiParams.user],
					parsed[ApiParams.dapp],
					parsed[ApiParams.requestHash],
					parsed[ApiParams.captchas],
					parsed[ApiParams.signature].user.requestHash,
					Number.parseInt(parsed[ApiParams.timestamp]),
					parsed[ApiParams.signature].provider.requestHash,
					req.ip || NO_IP_ADDRESS,
					flatten(req.headers, ","),
				);

			const returnValue: CaptchaSolutionResponse = {
				status: req.i18n.t(
					result.verified ? "API.CAPTCHA_PASSED" : "API.CAPTCHA_FAILED",
				),
				...result,
			};
			return res.json(returnValue);
		} catch (err) {
			tasks.logger.error(err);
			return next(
				new ProsopoApiError("API.UNKNOWN", {
					context: { code: 400, error: err },
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
		try {
			const { user, dapp, sessionId } = GetPowCaptchaChallengeRequestBody.parse(req.body);
			console.log("\n ----- \n user", user, "\n ----- \n");
			console.log("\n ----- \n dapp", dapp, "\n ----- \n");
			console.log("\n ----- \n sessionId", sessionId, "\n ----- \n");
			const clientSettings = await tasks.db.getClientRecord(dapp);

			const clientRecord = await tasks.db.getClientRecord(dapp);

			if (!clientRecord) {
				return res.json({
					error: req.i18n.t("API.SITE_KEY_NOT_REGISTERED"),
					code: 200,
				});
			}

			console.log("\n ----- \n clientSettings", clientSettings, "\n ----- \n");

			if (sessionId) {
				console.log("Session ID provided", sessionId);
				const sessionRecord = await tasks.db.checkAndRemoveSession(sessionId);
				if (!sessionRecord) {
					return next(
						new ProsopoApiError("API.BAD_REQUEST", {
							context: { error: "Session ID not found", code: 400 },
						}),
					);
				}
				
			}
			else if (clientSettings?.settings?.captchaType === "pow") {
				console.log("Direct pow is allowed");
			} else {
				// Throw an error
				return next(
					new ProsopoApiError("API.BAD_REQUEST", {
						context: { error: "No captcha type set", code: 400 },
					}),
				);
			}

			validateAddress(user, false, 42);
			validateAddress(dapp, false, 42);



			// TODO do something with domains

			const origin = req.headers.origin;

			if (!origin) {
				return next(
					new ProsopoApiError("API.BAD_REQUEST", {
						context: { error: "origin header not found", code: 400 },
					}),
				);
			}

			console.log("\n ----- \n clientSettings", clientSettings?.settings?.powDifficulty, "\n ----- \n");

			const challenge = await tasks.powCaptchaManager.getPowCaptchaChallenge(
				user,
				dapp,
				origin,
				clientSettings?.settings?.powDifficulty,
			);

			console.log("\n ----- \n challenge", challenge, "\n ----- \n");

			await tasks.db.storePowCaptchaRecord(
				challenge.challenge,
				{
					requestedAtTimestamp: challenge.requestedAtTimestamp,
					userAccount: user,
					dappAccount: dapp,
				},
				challenge.difficulty,
				challenge.providerSignature,
				req.ip || NO_IP_ADDRESS,
				flatten(req.headers, ","),
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
			tasks.logger.error(err);
			return next(
				new ProsopoApiError("API.BAD_REQUEST", {
					context: { code: 400, error: err },
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
		try {
			const { challenge, difficulty, signature, nonce, verifiedTimeout, dapp } =
				SubmitPowCaptchaSolutionBody.parse(req.body);

			const clientRecord = await tasks.db.getClientRecord(dapp);

			if (!clientRecord) {
				return res.json({
					error: req.i18n.t("API.SITE_KEY_NOT_REGISTERED"),
					code: 200,
				});
			}

			const verified = await tasks.powCaptchaManager.verifyPowCaptchaSolution(
				challenge,
				difficulty,
				signature.provider.challenge,
				nonce,
				verifiedTimeout,
				signature.user.timestamp,
				req.ip || NO_IP_ADDRESS,
				flatten(req.headers, ","),
			);
			const response: PowCaptchaSolutionResponse = { status: "ok", verified };
			return res.json(response);
		} catch (err) {
			tasks.logger.error(err);
			return next(
				new ProsopoApiError("API.BAD_REQUEST", {
					context: { code: 400, error: err },
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
				console.log("Received frictionless captcha challenge request");
				const { token, dapp } = GetFrictionlessCaptchaChallengeRequestBody.parse(
					req.body,
				);
				console.log(`Parsed request body. Token: ${token}, Dapp: ${dapp}`);

				const botScore = await getBotScore(token);
				console.log(`Bot score calculated: ${botScore}`);

				const clientConfig = await tasks.db.getClientRecord(dapp);
				console.log(`Retrieved client config for dapp: ${dapp}`, clientConfig);

				const botThreshold = clientConfig?.settings?.frictionlessThreshold || 0.5;
				console.log(`Bot threshold set to: ${botThreshold}`);

				if (botScore > botThreshold) {
					console.log("Bot score exceeds threshold. Returning image captcha.");
					const response: GetFrictionlessCaptchaResponse = {
						[ApiParams.captchaType]: "image",
						[ApiParams.status]: "ok",
					};
					console.log("Image captcha response:", response);
					return res.json(response);
				} else {
					console.log("Bot score below threshold. Proceeding with PoW captcha.");
					const sessionRecord: SessionRecord = {
						sessionId: uuidv4(),
						createdAt: new Date(),
					};
					console.log("Created session record:", sessionRecord);

					await tasks.db.storeSessionRecord(sessionRecord);
					console.log("Stored session record in database");

					const response: GetFrictionlessCaptchaResponse = {
						[ApiParams.captchaType]: "pow",
						[ApiParams.sessionId]: sessionRecord.sessionId,
						[ApiParams.status]: "ok",
					};
					console.log("PoW captcha response:", response);
					return res.json(response);
				}
			} catch (err) {
				console.error("Error in frictionless captcha challenge:", err);
				tasks.logger.error(err);
				return next(
					new ProsopoApiError("API.BAD_REQUEST", {
						context: { code: 400, error: err },
					}),
				);
			}
		},
	);

	/**
	 * Gets public details of the provider
	 */
	router.get(ApiPaths.GetProviderDetails, async (req, res, next) => {
		try {
			return res.json({ version, ...{ message: "Provider online" } });
		} catch (err) {
			tasks.logger.error(err);
			return next(
				new ProsopoApiError("API.BAD_REQUEST", {
					context: { code: 400, error: err },
				}),
			);
		}
	});

	// Your error handler should always be at the end of your application stack. Apparently it means not only after all
	// app.use() but also after all your app.get() and app.post() calls.
	// https://stackoverflow.com/a/62358794/1178971
	router.use(handleErrors);

	return router;
}
