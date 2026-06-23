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
import express, {
	type NextFunction,
	type Request,
	type Response,
	type Router,
} from "express";
import checkSpamEmail from "./captcha/checkSpamEmail.js";
import getFrictionlessCaptchaChallenge from "./captcha/getFrictionlessCaptchaChallenge.js";
import getImageCaptchaChallenge from "./captcha/getImageCaptchaChallenge.js";
import getPoWCaptchaChallenge from "./captcha/getPoWCaptchaChallenge.js";
import getPuzzleCaptchaChallenge from "./captcha/getPuzzleCaptchaChallenge.js";
import submitImageCaptchaSolution from "./captcha/submitImageCaptchaSolution.js";
import submitPoWCaptchaSolution from "./captcha/submitPoWCaptchaSolution.js";
import submitPuzzleCaptchaSolution from "./captcha/submitPuzzleCaptchaSolution.js";

/**
 * Wraps an async route handler so that any rejection - including synchronous
 * throws (e.g. from validateSiteKey/validateAddr) that become rejected
 * promises inside the async handler - is forwarded to Express's error handler.
 * Without this, Express 4 does not observe the rejection and the request hangs
 * instead of returning the intended 4xx response.
 *
 * The handler is invoked inside `Promise.resolve().then(...)` so that even a
 * truly synchronous throw (from a non-async handler) is captured as a rejected
 * promise and forwarded to `next`, rather than propagating synchronously.
 */
export const asyncHandler =
	(
		handler: (
			req: Request,
			res: Response,
			next: NextFunction,
		) => Promise<unknown>,
	) =>
	(req: Request, res: Response, next: NextFunction): void => {
		Promise.resolve()
			.then(() => handler(req, res, next))
			.catch(next);
	};

/**
 * Returns a router connected to the database which can interact with the Proposo protocol
 *
 * @return {Router} - A middleware router that can interact with the Prosopo protocol
 * @param {ProviderEnvironment} env - The Prosopo environment
 */
export function prosopoRouter(env: ProviderEnvironment): Router {
	const router = express.Router();

	// Maintenance-mode / Redis-down startup: the storage isn't initialised.
	// Pass `undefined` through; the captcha endpoints short-circuit before
	// any access-rules lookup when MAINTENANCE_MODE is on.
	let userAccessRulesStorage: ReturnType<
		ReturnType<ProviderEnvironment["getDb"]>["getUserAccessRulesStorage"]
	>;
	try {
		userAccessRulesStorage = env.getDb().getUserAccessRulesStorage();
	} catch (err) {
		env.logger.warn(() => ({
			msg: "User access rules storage unavailable; captcha endpoints will skip access-policy checks",
			err,
		}));
		userAccessRulesStorage = undefined as never;
	}

	/**
	 * Provides a Captcha puzzle to a Dapp User
	 */
	router.post(
		ClientApiPaths.GetImageCaptchaChallenge,
		asyncHandler(getImageCaptchaChallenge(env, userAccessRulesStorage)),
	);

	/**
	 * Receives solved CAPTCHA challenges from the user, stores to database, and checks against solution commitment
	 */
	router.post(
		ClientApiPaths.SubmitImageCaptchaSolution,
		asyncHandler(submitImageCaptchaSolution(env)),
	);

	/**
	 * Supplies a PoW challenge to a Dapp User
	 */
	router.post(
		ClientApiPaths.GetPowCaptchaChallenge,
		asyncHandler(getPoWCaptchaChallenge(env, userAccessRulesStorage)),
	);

	/**
	 * Verifies a user's PoW solution as being approved or not
	 */
	router.post(
		ClientApiPaths.SubmitPowCaptchaSolution,
		asyncHandler(submitPoWCaptchaSolution(env)),
	);

	/**
	 * Gets a frictionless captcha challenge
	 */
	router.post(
		ClientApiPaths.GetFrictionlessCaptchaChallenge,
		asyncHandler(getFrictionlessCaptchaChallenge(env, userAccessRulesStorage)),
	);

	/**
	 * Supplies a Puzzle challenge to a Dapp User
	 */
	router.post(
		ClientApiPaths.GetPuzzleCaptchaChallenge,
		asyncHandler(getPuzzleCaptchaChallenge(env, userAccessRulesStorage)),
	);

	/**
	 * Verifies a user's Puzzle solution as being approved or not
	 */
	router.post(
		ClientApiPaths.SubmitPuzzleCaptchaSolution,
		asyncHandler(submitPuzzleCaptchaSolution(env)),
	);

	/**
	 * Checks if an email domain is spam
	 */
	router.post(ClientApiPaths.CheckSpamEmail, asyncHandler(checkSpamEmail(env)));

	// Your error handler should always be at the end of your application stack. Apparently it means not only after all
	// app.use() but also after all your app.get() and app.post() calls.
	// https://stackoverflow.com/a/62358794/1178971
	router.use(handleErrors);

	return router;
}
