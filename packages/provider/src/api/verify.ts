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

import { handleErrors, verifySignature } from "@prosopo/api-express-router";
import { ProsopoApiError } from "@prosopo/common";
import {
	ApiParams,
	CaptchaType,
	ClientApiPaths,
	type ImageVerificationResponse,
	ServerPowCaptchaVerifyRequestBody,
	type ServerPowCaptchaVerifyRequestBodyOutput,
	ServerPuzzleCaptchaVerifyRequestBody,
	type ServerPuzzleCaptchaVerifyRequestBodyOutput,
	type VerificationResponse,
	VerifySolutionBody,
	type VerifySolutionBodyTypeOutput,
	decodeProcaptchaOutput,
} from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { AccessRulesStorage } from "@prosopo/user-access-policy";
import { validateAddress } from "@prosopo/util-crypto";
import express, { type Router } from "express";
import { Tasks } from "../tasks/tasks.js";
import { getMaintenanceMode } from "./admin/apiToggleMaintenanceModeEndpoint.js";
import { forwardVerifyIfNotIssuer } from "./forwardVerify.js";
import { metricsEnabled, recordCaptchaVerify } from "./metrics.js";
import {
	isReservedTestSiteKey,
	resolveTestSiteKeyVerdict,
} from "./testSiteKey.js";

// Derives the metrics `source` label for a verify request: maintenance mode and
// reserved CI test site keys return a verdict without a real verification, so
// they are labelled separately to keep the real human solve-rate clean.
const deriveVerifySource = (
	body: unknown,
): "real" | "test_key" | "maintenance" => {
	if (getMaintenanceMode()) return "maintenance";
	try {
		const token = (body as { token?: string })?.token;
		if (token) {
			const { dapp } = decodeProcaptchaOutput(token);
			if (isReservedTestSiteKey(dapp)) return "test_key";
		}
	} catch {
		// Malformed/undecodable token — treat as a real request.
	}
	return "real";
};

// Maps each verify route to its captcha type for metrics labelling.
const VERIFY_PATH_TYPE: Partial<Record<ClientApiPaths, CaptchaType>> = {
	[ClientApiPaths.VerifyImageCaptchaSolutionDapp]: CaptchaType.image,
	[ClientApiPaths.VerifyPowCaptchaSolution]: CaptchaType.pow,
	[ClientApiPaths.VerifyPuzzleCaptchaSolution]: CaptchaType.puzzle,
};

/**
 * Returns a router connected to the database which can interact with the Proposo protocol
 *
 * @return {Router} - A middleware router that can interact with the Prosopo protocol
 * @param {Environment} env - The Prosopo environment
 */
export function prosopoVerifyRouter(env: ProviderEnvironment): Router {
	const router = express.Router();
	// Verify endpoints short-circuit on maintenance mode before touching
	// access-rule storage; tolerate it being unavailable at startup.
	let userAccessRulesStorage: AccessRulesStorage;
	try {
		userAccessRulesStorage = env.getDb().getUserAccessRulesStorage();
	} catch (err) {
		env.logger.warn(() => ({
			msg: "User access rules storage unavailable; verify endpoints will skip access-policy checks",
			err,
		}));
		userAccessRulesStorage = undefined as never;
	}

	// Records the outcome of every verify response (type + verified/failed +
	// source) in one place by observing the JSON body, rather than threading a
	// metric call through each of the maintenance/test-key/no-challenge/real
	// return paths. Only successful (2xx) responses are counted; thrown errors
	// go through handleErrors and are captured by the http_requests_total
	// status label instead.
	router.use((req, res, next) => {
		if (!metricsEnabled()) return next();
		const type = VERIFY_PATH_TYPE[req.path as ClientApiPaths];
		if (!type) return next();
		const originalJson = res.json.bind(res);
		res.json = (body: unknown) => {
			if (res.statusCode < 300) {
				const verified = !!(
					body &&
					typeof body === "object" &&
					(body as { verified?: unknown }).verified
				);
				recordCaptchaVerify({
					type,
					verified,
					source: deriveVerifySource(req.body),
				});
			}
			return originalJson(body);
		};
		next();
	});

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
			// Maintenance-mode short-circuit must run before `new Tasks(env, ...)`
			// because the Tasks constructor calls `env.getDb()`, which throws when
			// `env.db` is undefined (the maintenance-mode case).
			if (getMaintenanceMode()) {
				req.logger.info(() => ({
					msg: "Maintenance mode active - returning verified for image captcha verification",
				}));
				const verificationResponse: ImageVerificationResponse = {
					status: "ok",
					verified: true,
				};
				return res.json(verificationResponse);
			}

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
			const { dappSignature, token, ip, maxVerifiedTime, email } = parsed;
			try {
				// This can error if the token is invalid
				const { user, dapp, timestamp, commitmentId, providerUrl } =
					decodeProcaptchaOutput(token);

				// Reserved CI test site keys force a deterministic verdict before
				// the signature and registered-key checks, so the dapp server needs
				// no real secret and the key works in every environment.
				const testVerdict = resolveTestSiteKeyVerdict(dapp, req.logger);
				if (testVerdict !== null) {
					const verificationResponse: ImageVerificationResponse = {
						status: "ok",
						verified: testVerdict,
					};
					return res.json(verificationResponse);
				}

				// A client can verify against any pronode: if this node did not
				// issue the token, forward the request to the provider that did
				// and return its result. Only this provider can verify its own
				// commitment, so do this before any local lookup.
				const forwarded = await forwardVerifyIfNotIssuer({
					env,
					logger: req.logger,
					path: ClientApiPaths.VerifyImageCaptchaSolutionDapp,
					providerUrl,
					dapp,
					user,
					body: parsed,
				});
				if (forwarded) {
					return res.json(forwarded);
				}

				// Only construct Tasks (which opens the DB) once we know this node
				// is the issuer and must verify locally — non-issuer nodes forward
				// above and never touch the DB.
				const tasks = new Tasks(env, req.logger);

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
						env,
						maxVerifiedTime,
						ip,
						clientRecord.settings.disallowWebView,
						clientRecord.settings.contextAware?.enabled,
						userAccessRulesStorage,
						email,
						clientRecord.settings.spamEmailDomainCheckEnabled,
						clientRecord.settings.spamFilter,
						clientRecord.settings.trafficFilter,
						clientRecord.settings.storeMetadata,
					);

				req.logger.debug(() => ({ data: { response } }));
				const verificationResponse: ImageVerificationResponse =
					tasks.imgCaptchaManager.getVerificationResponse(
						response[ApiParams.verified],
						clientRecord,
						req.i18n.t,
						response[ApiParams.score],
						response[ApiParams.commitmentId],
						response[ApiParams.status],
					);
				res.json(verificationResponse);
			} catch (err) {
				req.logger.error(() => ({ err, data: { body: req.body } }));
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
			// Maintenance-mode short-circuit must run before `new Tasks(env, ...)`
			// because the Tasks constructor calls `env.getDb()`, which throws when
			// `env.db` is undefined (the maintenance-mode case).
			if (getMaintenanceMode()) {
				req.logger.info(() => ({
					msg: "Maintenance mode active - returning verified for PoW captcha verification",
				}));
				const verificationResponse: VerificationResponse = {
					status: "ok",
					verified: true,
				};
				return res.json(verificationResponse);
			}

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
				const { token, dappSignature, ip, email } = parsed;

				// This can error if the token is invalid
				const { dapp, user, timestamp, challenge, providerUrl } =
					decodeProcaptchaOutput(token);

				// Reserved CI test site keys force a deterministic verdict before
				// the signature and registered-key checks, so the dapp server needs
				// no real secret and the key works in every environment.
				const testVerdict = resolveTestSiteKeyVerdict(dapp, req.logger);
				if (testVerdict !== null) {
					const verificationResponse: VerificationResponse = {
						status: "ok",
						verified: testVerdict,
					};
					return res.json(verificationResponse);
				}

				// A client can verify against any pronode: if this node did not
				// issue the token, forward the request to the provider that did
				// and return its result. Only this provider can verify its own
				// challenge, so do this before any local lookup.
				const forwarded = await forwardVerifyIfNotIssuer({
					env,
					logger: req.logger,
					path: ClientApiPaths.VerifyPowCaptchaSolution,
					providerUrl,
					dapp,
					user,
					body: parsed,
				});
				if (forwarded) {
					return res.json(forwarded);
				}

				// Only construct Tasks (which opens the DB) once we know this node
				// is the issuer and must verify locally — non-issuer nodes forward
				// above and never touch the DB.
				const tasks = new Tasks(env, req.logger);

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

				const { verified, score, reason } =
					await tasks.powCaptchaManager.serverVerifyPowCaptchaSolution(
						dapp,
						challenge,
						clientRecord.settings.verifiedTimeout,
						env,
						ip,
						userAccessRulesStorage,
						email,
						clientRecord.settings.spamEmailDomainCheckEnabled,
						clientRecord.settings.spamFilter,
						clientRecord.settings.trafficFilter,
						clientRecord.settings.storeMetadata,
					);

				const verificationResponse: VerificationResponse =
					tasks.powCaptchaManager.getVerificationResponse(
						verified,
						clientRecord,
						req.i18n.t,
						score,
						reason,
					);

				return res.json(verificationResponse);
			} catch (err) {
				req.logger.error(() => ({
					msg: "Error in verifyPowCaptchaSolution",
					err,
					data: { body: req.body },
				}));
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

	/**
	 * Verifies a dapp's puzzle captcha solution as being approved or not
	 *
	 * @param {string} token - Token containing dapp, blockNumber and challenge
	 * @param {string} dappSignature - Signed token
	 * @param {number} verifiedTimeout - The maximum time in milliseconds to be valid
	 */
	router.post(
		ClientApiPaths.VerifyPuzzleCaptchaSolution,
		async (req, res, next) => {
			// Maintenance-mode short-circuit must run before `new Tasks(env, ...)`
			// because the Tasks constructor calls `env.getDb()`, which throws when
			// `env.db` is undefined (the maintenance-mode case).
			if (getMaintenanceMode()) {
				req.logger.info(() => ({
					msg: "Maintenance mode active - returning verified for puzzle captcha verification",
				}));
				const verificationResponse: VerificationResponse = {
					status: "ok",
					verified: true,
				};
				return res.json(verificationResponse);
			}

			let parsed: ServerPuzzleCaptchaVerifyRequestBodyOutput;

			// We can be helpful and provide a more detailed error message when there are missing fields
			try {
				parsed = ServerPuzzleCaptchaVerifyRequestBody.parse(req.body);
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
				const { token, dappSignature, ip, email } = parsed;

				// This can error if the token is invalid
				const { dapp, user, timestamp, challenge, providerUrl } =
					decodeProcaptchaOutput(token);

				// Reserved CI test site keys force a deterministic verdict before
				// the signature and registered-key checks, so the dapp server needs
				// no real secret and the key works in every environment.
				const testVerdict = resolveTestSiteKeyVerdict(dapp, req.logger);
				if (testVerdict !== null) {
					const verificationResponse: VerificationResponse = {
						status: "ok",
						verified: testVerdict,
					};
					return res.json(verificationResponse);
				}

				// A client can verify against any pronode: if this node did not
				// issue the token, forward the request to the provider that did
				// and return its result. Only this provider can verify its own
				// challenge, so do this before any local lookup.
				const forwarded = await forwardVerifyIfNotIssuer({
					env,
					logger: req.logger,
					path: ClientApiPaths.VerifyPuzzleCaptchaSolution,
					providerUrl,
					dapp,
					user,
					body: parsed,
				});
				if (forwarded) {
					return res.json(forwarded);
				}

				// Only construct Tasks (which opens the DB) once we know this node
				// is the issuer and must verify locally — non-issuer nodes forward
				// above and never touch the DB.
				const tasks = new Tasks(env, req.logger);

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
					await tasks.puzzleCaptchaManager.serverVerifyPuzzleCaptchaSolution(
						dapp,
						challenge,
						clientRecord.settings.verifiedTimeout,
						env,
						ip,
						userAccessRulesStorage,
						email,
						clientRecord.settings.spamEmailDomainCheckEnabled,
						clientRecord.settings.trafficFilter,
						clientRecord.settings.storeMetadata,
					);

				const verificationResponse: VerificationResponse =
					tasks.puzzleCaptchaManager.getVerificationResponse(
						verified,
						clientRecord,
						req.i18n.t,
						score,
					);

				return res.json(verificationResponse);
			} catch (err) {
				req.logger.error(() => ({
					msg: "Error in verifyPuzzleCaptchaSolution",
					err,
					data: { body: req.body },
				}));
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
