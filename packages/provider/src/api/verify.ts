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

import { validateAddress } from "@polkadot/util-crypto/address";
import { handleErrors } from "@prosopo/api-express-router";
import { ProsopoApiError } from "@prosopo/common";
import {
	ApiParams,
	ClientApiPaths,
	type ImageVerificationResponse,
	ServerPowCaptchaVerifyRequestBody,
	type ServerPowCaptchaVerifyRequestBodyOutput,
	type VerificationResponse,
	VerifySolutionBody,
	type VerifySolutionBodyTypeOutput,
	decodeProcaptchaOutput,
} from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import express, { type Router } from "express";
import { Tasks } from "../tasks/tasks.js";
import { verifySignature } from "./authMiddleware.js";

/**
 * Returns a router connected to the database which can interact with the Proposo protocol
 *
 * @return {Router} - A middleware router that can interact with the Prosopo protocol
 * @param {Environment} env - The Prosopo environment
 */
export function prosopoVerifyRouter(env: ProviderEnvironment): Router {
	const router = express.Router();
	const tasks = new Tasks(env);

	/**
	 * Verifies a dapp's solution as being approved or not
	 *
	 * @param {string} user - Dapp User AccountId
	 * @param {string} dapp - Dapp Contract AccountId
	 * @param {string} blockNumber - The block number at which the captcha was requested
	 * @param {string} dappUserSignature - The signature fo dapp user
	 * @param {string} commitmentId - The captcha solution to look up
	 * @param {number} maxVerifiedTime - The maximum time in milliseconds since the blockNumber
	 */
	router.post(
		ClientApiPaths.VerifyImageCaptchaSolutionDapp,
		async (req, res, next) => {
			// We can be helpful and provide a more detailed error message when there are missing fields
			let parsed: VerifySolutionBodyTypeOutput;
			try {
				parsed = VerifySolutionBody.parse(req.body);
			} catch (err) {
				return next(
					new ProsopoApiError("CAPTCHA.PARSE_ERROR", {
						context: { code: 400, error: err, body: req.body },
						i18n: req.i18n,
						logger: req.logger,
					}),
				);
			}

			// We don't want to expose any other errors to the client except for specific situations
			const { dappSignature, token } = parsed;
			try {
				// This can error if the token is invalid
				const { user, dapp, timestamp, commitmentId } =
					decodeProcaptchaOutput(token);

				// Do this before checking the db
				validateAddress(dapp, false, 42);
				validateAddress(user, false, 42);

				// Reject any unregistered site keys
				const clientRecord = await tasks.db.getClientRecord(dapp);
				if (!clientRecord) {
					return next(
						new ProsopoApiError("API.SITE_KEY_NOT_REGISTERED", {
							context: { code: 400, siteKey: dapp, user },
							i18n: req.i18n,
							logger: req.logger,
						}),
					);
				}

				// Verify using the appropriate pair based on isDapp flag
				const keyPair = env.keyring.addFromAddress(dapp);

				// Will throw an error if the signature is invalid
				verifySignature(dappSignature, timestamp.toString(), keyPair);

				const response =
					await tasks.imgCaptchaManager.verifyImageCaptchaSolution(
						user,
						dapp,
						commitmentId,
						parsed.maxVerifiedTime,
					);

				req.logger.debug(response);
				const verificationResponse: ImageVerificationResponse =
					tasks.imgCaptchaManager.getVerificationResponse(
						response[ApiParams.verified],
						clientRecord,
						req.i18n.t,
						response[ApiParams.score],
						response[ApiParams.commitmentId],
					);
				res.json(verificationResponse);
			} catch (err) {
				req.logger.error({ err, body: req.body });
				return next(
					new ProsopoApiError("API.BAD_REQUEST", {
						context: { code: 500, siteKey: req.body.dapp, user: req.body.user },
						i18n: req.i18n,
						logger: req.logger,
					}),
				);
			}
		},
	);

	/**
	 * Verifies a dapp's solution as being approved or not
	 *
	 * @param {string} token - Token containing dapp, blockNumber and challenge
	 * @param {string} dappSignature - Signed token
	 * @param {number} verifiedTimeout - The maximum time in milliseconds to be valid
	 */
	router.post(
		ClientApiPaths.VerifyPowCaptchaSolution,
		async (req, res, next) => {
			let parsed: ServerPowCaptchaVerifyRequestBodyOutput;
			// We can be helpful and provide a more detailed error message when there are missing fields
			try {
				parsed = ServerPowCaptchaVerifyRequestBody.parse(req.body);
			} catch (err) {
				return next(
					new ProsopoApiError("CAPTCHA.PARSE_ERROR", {
						context: { code: 400, error: err, body: req.body },
						i18n: req.i18n,
						logger: req.logger,
					}),
				);
			}

			// We don't want to expose any other errors to the client
			try {
				const { token, dappSignature, verifiedTimeout } = parsed;

				// This can error if the token is invalid
				const { dapp, user, timestamp, challenge } =
					decodeProcaptchaOutput(token);

				// Do this before checking the db
				validateAddress(dapp, false, 42);
				validateAddress(user, false, 42);

				// Reject any unregistered site keys
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

				if (!challenge) {
					const unverifiedResponse: VerificationResponse = {
						status: req.i18n.t("API.USER_NOT_VERIFIED"),
						[ApiParams.verified]: false,
					};
					return res.json(unverifiedResponse);
				}

				// Verify using the dapp pair passed in the request
				const dappPair = env.keyring.addFromAddress(dapp);

				// Will throw an error if the signature is invalid
				verifySignature(dappSignature, timestamp.toString(), dappPair);

				const { verified, score } =
					await tasks.powCaptchaManager.serverVerifyPowCaptchaSolution(
						dapp,
						challenge,
						verifiedTimeout,
					);

				const verificationResponse: VerificationResponse =
					tasks.powCaptchaManager.getVerificationResponse(
						verified,
						clientRecord,
						req.i18n.t,
						score,
					);

				return res.json(verificationResponse);
			} catch (err) {
				req.logger.error({ err, body: req.body });
				return next(
					new ProsopoApiError("API.BAD_REQUEST", {
						context: { code: 500, error: err },
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
