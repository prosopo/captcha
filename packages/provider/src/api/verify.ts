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

import { ProsopoApiError } from "@prosopo/common";
import {
	ApiParams,
	ApiPaths,
	type ImageVerificationResponse,
	ServerPowCaptchaVerifyRequestBody,
	type VerificationResponse,
	VerifySolutionBody,
	decodeProcaptchaOutput,
} from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import express, {
	type NextFunction,
	type Request,
	type Response,
	type Router,
} from "express";
import { Tasks } from "../tasks/tasks.js";
import { verifySignature } from "./authMiddleware.js";
import { handleErrors } from "./errorHandler.js";

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
			try {
				const parsed = VerifySolutionBody.parse(req.body);
				const { dappSignature, token } = parsed;
				const { user, dapp, timestamp, commitmentId } =
					decodeProcaptchaOutput(token);

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
				return next(
					new ProsopoApiError("CAPTCHA.PARSE_ERROR", {
						context: { code: 400, error: err },
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
		try {
			const { token, dappSignature, verifiedTimeout } =
				ServerPowCaptchaVerifyRequestBody.parse(req.body);
			const { dapp, timestamp, challenge } = decodeProcaptchaOutput(token);

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
