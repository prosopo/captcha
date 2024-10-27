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
import type { KeyringPair } from "@polkadot/keyring/types";
import { hexToU8a, isHex } from "@polkadot/util";
import { ProsopoApiError, ProsopoEnvError } from "@prosopo/common";
import { ApiPrefix } from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { NextFunction, Request, Response } from "express";
import { Address6 } from "ip-address";
import { getIPAddress } from "../util.js";

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
				console.log("No IP", req.ip);
				return res.status(401).json({ error: "Unauthorized" });
			}
			const ipAddress = getIPAddress(req.ip || "");
			const rule = await env.getDb().getBlockRuleRecord(ipAddress.bigInt());
			if (rule && BigInt(rule.ipAddress) === ipAddress.bigInt()) {
				// block by IP address globally
				if (rule.global) {
					return res.status(401).json({ error: "Unauthorized" });
				}

				// check if this rule applies to this client
				// TODO - we need to ensure client is always in the same place in the request object
			}

			next();
			return;
		} catch (err) {
			console.error("Block Middleware Error:", err);
			res.status(401).json({ error: "Unauthorized", message: err });
			return;
		}
	};
};
