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
import { validateAddress } from "@polkadot/util-crypto/address";
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

			await env.isReady();

			const ipAddress = getIPAddress(req.ip || "");
			const userAccount = req.headers["Prosopo-User"] || req.body.user;
			const dappAccount = req.headers["Prosopo-Site-Key"] || req.body.dapp;
			const rule = await env.getDb().getIPBlockRuleRecord(ipAddress.bigInt());
			if (rule && BigInt(rule.ip) === ipAddress.bigInt()) {
				// block by IP address globally
				if (rule.global && rule.hardBlock) {
					return res.status(401).json({ error: "Unauthorized" });
				}

				if (dappAccount) {
					const dappRule = await env
						.getDb()
						.getIPBlockRuleRecord(ipAddress.bigInt(), dappAccount);
					if (
						dappRule?.hardBlock &&
						dappRule.dappAccount === dappAccount &&
						BigInt(dappRule.ip) === ipAddress.bigInt()
					) {
						return res.status(401).json({ error: "Unauthorized" });
					}
				}
			}

			if (userAccount && dappAccount) {
				const rule = await env
					.getDb()
					.getUserBlockRuleRecord(userAccount, dappAccount);

				if (
					rule &&
					rule.userAccount === userAccount &&
					rule.dappAccount === dappAccount &&
					rule.hardBlock
				) {
					return res.status(401).json({ error: "Unauthorized" });
				}
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
