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

import { handleErrors } from "@prosopo/api-express-router";
import { ClientApiPaths } from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import express, { type Router } from "express";
import getFrictionlessCaptchaChallenge from "./captcha/getFrictionlessCaptchaChallenge.js";
import getImageCaptchaChallenge from "./captcha/getImageCaptchaChallenge.js";
import getPoWCaptchaChallenge from "./captcha/getPoWCaptchaChallenge.js";
import submitImageCaptchaSolution from "./captcha/submitImageCaptchaSolution.js";
import submitPoWCaptchaSolution from "./captcha/submitPoWCaptchaSolution.js";

/**
 * Returns a router connected to the database which can interact with the Proposo protocol
 *
 * @return {Router} - A middleware router that can interact with the Prosopo protocol
 * @param {ProviderEnvironment} env - The Prosopo environment
 */
export function prosopoRouter(env: ProviderEnvironment): Router {
	const router = express.Router();

	const userAccessRulesStorage = env.getDb().getUserAccessRulesStorage();

	/**
	 * Provides a Captcha puzzle to a Dapp User
	 */
	router.post(ClientApiPaths.GetImageCaptchaChallenge, (req, res, next) =>
		getImageCaptchaChallenge(env, userAccessRulesStorage)(req, res, next),
	);

	/**
	 * Receives solved CAPTCHA challenges from the user, stores to database, and checks against solution commitment
	 */
	router.post(ClientApiPaths.SubmitImageCaptchaSolution, (req, res, next) =>
		submitImageCaptchaSolution(env)(req, res, next),
	);

	/**
	 * Supplies a PoW challenge to a Dapp User
	 */
	router.post(ClientApiPaths.GetPowCaptchaChallenge, (req, res, next) =>
		getPoWCaptchaChallenge(env, userAccessRulesStorage)(req, res, next),
	);

	/**
	 * Verifies a user's PoW solution as being approved or not
	 */
	router.post(ClientApiPaths.SubmitPowCaptchaSolution, (req, res, next) =>
		submitPoWCaptchaSolution(env)(req, res, next),
	);

	/**
	 * Gets a frictionless captcha challenge
	 */
	router.post(
		ClientApiPaths.GetFrictionlessCaptchaChallenge,
		(req, res, next) =>
			getFrictionlessCaptchaChallenge(env, userAccessRulesStorage)(
				req,
				res,
				next,
			),
	);

	// Your error handler should always be at the end of your application stack. Apparently it means not only after all
	// app.use() but also after all your app.get() and app.post() calls.
	// https://stackoverflow.com/a/62358794/1178971
	router.use(handleErrors);

	return router;
}
