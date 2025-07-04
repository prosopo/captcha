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

import { ProsopoApiError, getLogger } from "@prosopo/common";
import { getJA4 } from "@prosopo/provider";
import {
	ClientApiPaths,
	VerifySolutionBody,
	decodeProcaptchaOutput,
} from "@prosopo/types";
import type { VerifySolutionBodyTypeOutput } from "@prosopo/types";
import express, { type Router } from "express";
import { JA4Database } from "./db.js";

/**
 * Returns a router connected to the database which can interact with the Proposo protocol
 *
 * @return {Router} - A middleware router that can interact with the Prosopo protocol
 */
export function prosopoRouter(): Router {
	const router = express.Router();
	const db = new JA4Database(
		process.env.MONGO_URL || "mongodb://localhost:27017",
		process.env.MONGO_DBNAME || "client",
		process.env.MONGO_AUTH_SOURCE || "admin",
	);

	/**
	 * Verifies a user's solution as being approved or not
	 *
	 * @param {string} userAccount - Dapp User id
	 * @param {string} commitmentId - The captcha solution to look up
	 */
	router.post(
		ClientApiPaths.VerifyImageCaptchaSolutionDapp,
		async (req, res, next) => {
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
				const { token } = body;
				const { user, dapp, commitmentId } = decodeProcaptchaOutput(token);
				const testCommitmentId = "0x123456789test";
				const testAccount = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
				const testDapp = "5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqi1eSuyUpnhM";
				let statusMessage = "API.USER_NOT_VERIFIED";
				let approved = false;
				if (
					(user && user === testAccount) ||
					(commitmentId && commitmentId === testCommitmentId) ||
					(dapp && dapp === testDapp)
				) {
					approved = true;
					statusMessage = "API.USER_VERIFIED";
					return res.json({
						status: req.t(statusMessage),
						verified: approved,
						commitmentId: testCommitmentId,
					});
				}

				return res.json({
					status: req.t(statusMessage),
					verified: false,
				});
			} catch (err) {
				return next(
					new ProsopoApiError("API.UNKNOWN", {
						context: { error: err, code: 500 },
					}),
				);
			}
		},
	);

	router.get("/test", async (req, res) => {
		try {
			const logger = getLogger("info", import.meta.url);
			const ja4PlusFingerprint = await getJA4(req.headers, logger);
			await db.connect();
			await db.addOrUpdateJA4Record({
				ja4_fingerprint: ja4PlusFingerprint.ja4PlusFingerprint,
				user_agent_string: req.headers["user-agent"] || "",
			});
			await db.close();
			return res.json({
				ja4: ja4PlusFingerprint.ja4PlusFingerprint,
				ua: req.headers["user-agent"],
			});
		} catch (e) {
			console.error("Error parsing ClientHello:", e);
			return res.status(500).send("Error parsing ClientHello.");
		}
	});

	return router;
}
