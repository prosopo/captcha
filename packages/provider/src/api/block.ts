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

import { getLoggerDefault } from "@prosopo/common";
import { ApiPrefix } from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { NextFunction, Request, Response } from "express";
import { checkIpRules } from "../rules/ip.js";
import { checkUserRules } from "../rules/user.js";
import { getIPAddress } from "../util.js";

const logger = getLoggerDefault();

export const blockMiddleware = (env: ProviderEnvironment) => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			// Stops this middleware from running on non-api routes like /json /favicon.ico etc
			if (req.url.indexOf(ApiPrefix) === -1) {
				next();
				return;
			}

			// if no IP block
			if (!req.ip) {
				logger.info("No IP", req.ip);
				return res.status(401).json({ error: "Unauthorized" });
			}

			await env.isReady();

			const ipAddress = getIPAddress(req.ip || "");
			const userAccount = req.headers["Prosopo-User"] || req.body.user;
			const dappAccount = req.headers["Prosopo-Site-Key"] || req.body.dapp;

			// get matching IP rules
			const rule = await checkIpRules(env.getDb(), ipAddress, dappAccount);

			// block if hard block
			if (rule?.hardBlock) {
				return res.status(401).json({ error: "Unauthorized" });
			}

			// get matching user rules
			const userRule = await checkUserRules(
				env.getDb(),
				userAccount,
				dappAccount,
			);

			// block if hard block
			if (userRule?.hardBlock) {
				return res.status(401).json({ error: "Unauthorized" });
			}

			next();
			return;
		} catch (err) {
			logger.error("Block Middleware Error:", err);
			res.status(401).json({ error: "Unauthorized" });
			return;
		}
	};
};
