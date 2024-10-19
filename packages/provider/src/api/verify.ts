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
import {
	ApiParams,
	ApiPaths,
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
import { handleErrors } from "./errorHandler.js";
import { ClientRecord } from "@prosopo/types-database";

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
		ApiPaths.VerifyImageCaptchaSolutionDapp,
		async (req, res, next) => {
			// We can be helpful and provide a more detailed error message when there are missing fields
			let parsed: VerifySolutionBodyTypeOutput;
			try {
				parsed = VerifySolutionBody.parse(req.body);
			} catch (err) {
				return next(
					new ProsopoApiError("CAPTCHA.PARSE_ERROR", {
						context: { code: 400, error: err, body: req.body },
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
				// if (!clientRecord) {
				// 	return next(
				// 		new ProsopoApiError("API.SITE_KEY_NOT_REGISTERED", {
				// 			context: { code: 400, siteKey: dapp },
				// 		}),
				// 	);
				// }

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

				const verificationResponse: ImageVerificationResponse = {
					[ApiParams.status]: req.t(response.status),
					[ApiParams.verified]: response[ApiParams.verified],
					...(response.commitmentId && {
						[ApiParams.commitmentId]: response.commitmentId,
					}),
				};
				res.json(verificationResponse);
			} catch (err) {
				tasks.logger.error({ err, body: req.body });
				return next(
					new ProsopoApiError("API.BAD_REQUEST", {
						context: { code: 500 },
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
	router.post(ApiPaths.VerifyPowCaptchaSolution, async (req, res, next) => {
		let parsed: ServerPowCaptchaVerifyRequestBodyOutput;
		// We can be helpful and provide a more detailed error message when there are missing fields
		try {
			parsed = ServerPowCaptchaVerifyRequestBody.parse(req.body);
		} catch (err) {
			return next(
				new ProsopoApiError("CAPTCHA.PARSE_ERROR", {
					context: { code: 400, error: err, body: req.body },
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
			// if (!clientRecord) {
			// 	return next(
			// 		new ProsopoApiError("API.SITE_KEY_NOT_REGISTERED", {
			// 			context: { code: 400, siteKey: dapp },
			// 		}),
			// 	);
			// }

			if (!challenge) {
				const unverifiedResponse: VerificationResponse = {
					status: req.t("API.USER_NOT_VERIFIED"),
					[ApiParams.verified]: false,
				};
				return res.json(unverifiedResponse);
			}

			// Verify using the dapp pair passed in the request
			const dappPair = env.keyring.addFromAddress(dapp);

			// Will throw an error if the signature is invalid
			verifySignature(dappSignature, timestamp.toString(), dappPair);

			const approved =
				await tasks.powCaptchaManager.serverVerifyPowCaptchaSolution(
					dapp,
					challenge,
					verifiedTimeout,
				);

			const verificationResponse: VerificationResponse = {
				status: req.t(approved ? "API.USER_VERIFIED" : "API.USER_NOT_VERIFIED"),
				[ApiParams.verified]: approved,
			};

			return res.json(verificationResponse);
		} catch (err) {
			tasks.logger.error({ err, body: req.body });
			return next(
				new ProsopoApiError("API.BAD_REQUEST", {
					context: { code: 500 },
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
