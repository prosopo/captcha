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

import type { IncomingHttpHeaders } from "node:http";
import { ProsopoApiError } from "@prosopo/common";
import { type Logger, getLogger } from "@prosopo/logger";
import { getJA4 } from "@prosopo/provider";
import {
	ClientApiPaths,
	type ProcaptchaOutput,
	type ProcaptchaToken,
	VerifySolutionBody,
	decodeProcaptchaOutput,
} from "@prosopo/types";
import type { VerifySolutionBodyTypeOutput } from "@prosopo/types";
import express, { type RequestHandler, type Router } from "express";
import { JA4Database, type JA4Store } from "./db.js";
import { verifyProcaptchaOutput } from "./verify.js";

/** Just enough of an express request for the handlers below. */
export interface ApiRequest {
	body: unknown;
	headers: IncomingHttpHeaders;
	t: (key: string) => string;
}

/** Just enough of an express response for the handlers below. */
export interface ApiResponse {
	json: (body: object) => unknown;
	status: (code: number) => { send: (body: string) => unknown };
}

export type ApiNext = (error: unknown) => void;

export interface RouterDeps {
	db: JA4Store;
	getJA4: (
		headers: IncomingHttpHeaders,
		logger?: Logger,
	) => Promise<{ ja4PlusFingerprint: string }>;
	decodeToken: (token: ProcaptchaToken) => ProcaptchaOutput;
	logger: Logger;
}

export const DEFAULT_MONGO_URL = "mongodb://localhost:27017";
export const DEFAULT_MONGO_DBNAME = "client";
export const DEFAULT_MONGO_AUTH_SOURCE = "admin";

export const createDatabase = (
	env: NodeJS.ProcessEnv = process.env,
): JA4Database =>
	new JA4Database(
		env.MONGO_URL || DEFAULT_MONGO_URL,
		env.MONGO_DBNAME || DEFAULT_MONGO_DBNAME,
		env.MONGO_AUTH_SOURCE || DEFAULT_MONGO_AUTH_SOURCE,
	);

export const defaultRouterDeps = (): RouterDeps => ({
	db: createDatabase(),
	getJA4,
	decodeToken: decodeProcaptchaOutput,
	logger: getLogger("info", "provider-mock:api"),
});

/**
 * Verify a solution, as the real provider would.
 *
 * A body that does not parse is the caller's fault and is reported as a 400; a
 * token that parses but cannot be decoded is reported as a 500, because at that
 * point the request looked well formed and the mock cannot tell the difference
 * between a corrupt token and a bug of its own.
 */
export const createVerifyHandler =
	(deps: RouterDeps) =>
	async (req: ApiRequest, res: ApiResponse, next: ApiNext): Promise<void> => {
		let body: VerifySolutionBodyTypeOutput;
		try {
			body = VerifySolutionBody.parse(req.body);
		} catch (err) {
			return next(
				new ProsopoApiError("CAPTCHA.PARSE_ERROR", {
					context: { error: err, code: 400 },
					logLevel: "info",
				}),
			);
		}
		try {
			const outcome = verifyProcaptchaOutput(deps.decodeToken(body.token));
			res.json({
				status: req.t(outcome.statusMessage),
				verified: outcome.verified,
				...(outcome.commitmentId === undefined
					? {}
					: { commitmentId: outcome.commitmentId }),
			});
		} catch (err) {
			return next(
				new ProsopoApiError("API.UNKNOWN", {
					context: { error: err, code: 500 },
				}),
			);
		}
	};

/** Record the caller's JA4 fingerprint and hand it back to them. */
export const createTestHandler =
	(deps: RouterDeps) =>
	async (req: ApiRequest, res: ApiResponse): Promise<void> => {
		try {
			const { ja4PlusFingerprint } = await deps.getJA4(
				req.headers,
				deps.logger,
			);
			try {
				await deps.db.connect();
				await deps.db.addOrUpdateJA4Record({
					ja4_fingerprint: ja4PlusFingerprint,
					user_agent_string: req.headers["user-agent"] || "",
				});
			} finally {
				// The close used to be skipped whenever anything above it threw, so
				// every failing request leaked its connection.
				await deps.db.close();
			}
			res.json({
				ja4: ja4PlusFingerprint,
				ua: req.headers["user-agent"],
			});
		} catch (e) {
			deps.logger.error(() => ({
				err: e instanceof Error ? e : new Error(String(e)),
				msg: "Error parsing ClientHello",
			}));
			res.status(500).send("Error parsing ClientHello.");
		}
	};

/**
 * Adapt a handler written against the narrow request/response types above to
 * the express signature. Express hands the same objects through untouched; the
 * narrow types exist only so tests can pass plain objects.
 */
export const toRequestHandler = (
	handler: (req: ApiRequest, res: ApiResponse, next: ApiNext) => Promise<void>,
): RequestHandler => {
	const adapted: RequestHandler = (req, res, next): void => {
		// Express ignores a returned promise, so a rejection here would surface as
		// an unhandled rejection and the request would hang; hand it to the error
		// middleware instead.
		handler(
			req as unknown as ApiRequest,
			res as unknown as ApiResponse,
			next,
		).catch(next);
	};
	return adapted;
};

/**
 * Returns a router connected to the database which can interact with the Proposo protocol
 *
 * @return {Router} - A middleware router that can interact with the Prosopo protocol
 */
export function prosopoRouter(deps: RouterDeps = defaultRouterDeps()): Router {
	const router = express.Router();

	router.post(
		ClientApiPaths.VerifyImageCaptchaSolutionDapp,
		toRequestHandler(createVerifyHandler(deps)),
	);

	router.get("/test", toRequestHandler(createTestHandler(deps)));

	return router;
}
