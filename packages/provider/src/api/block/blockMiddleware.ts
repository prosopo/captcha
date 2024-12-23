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
import type { Logger } from "@prosopo/common";
import { ApiPrefix } from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { NextFunction, Request, Response } from "express";
import { checkIpRules } from "../../rules/ip.js";
import { checkUserRules } from "../../rules/user.js";
import { getIPAddress } from "../../util.js";
import type { Address4, Address6 } from "ip-address";
import type { IProviderDatabase } from "@prosopo/types-database";

class BlockMiddleware {
	public constructor(
		private readonly env: ProviderEnvironment,
		private readonly logger: Logger,
	) {}

	public async processRequest(req: Request, res: Response, next: NextFunction) {
		// Run this middleware only on non-api routes like /json /favicon.ico etc
		if (this.isApiPath(req.url)) {
			const accessDenied = await this.isAccessDenied(req);

			if (accessDenied) {
				res.status(401).json({ error: "Unauthorized" });
				return;
			}
		}

		next();
	}

	protected isApiPath(url: string): boolean {
		return -1 !== url.indexOf(ApiPrefix);
	}

	protected async isAccessDenied(req: Request): Promise<boolean> {
		const rawIp = req.ip || "";

		// if no IP block
		if (!rawIp) {
			this.logger.info("No IP");

			return true;
		}

		try {
			const ipAddress = getIPAddress(rawIp);
			const userAccount = req.headers["Prosopo-User"] || req.body.user || "";
			const dappAccount =
				req.headers["Prosopo-Site-Key"] || req.body.dapp || "";

			await this.env.isReady();

			return await this.isUserRequestBlocked(
				this.env.getDb(),
				ipAddress,
				userAccount,
				dappAccount,
			);
		} catch (err) {
			this.logger.error("Block Middleware Error:", err);

			return true;
		}
	}

	protected async isUserRequestBlocked(
		db: IProviderDatabase,
		ipAddress: Address4 | Address6,
		userAccount: string,
		dappAccount: string,
	): Promise<boolean> {
		const ipHardBlocked = await this.isIpBlocked(db, ipAddress, dappAccount);

		if (ipHardBlocked) {
			return true;
		}

		const userHardBlocked = await this.isUserBlocked(
			db,
			userAccount,
			dappAccount,
		);

		if (userHardBlocked) {
			return true;
		}

		return false;
	}

	protected async isIpBlocked(
		db: IProviderDatabase,
		ipAddress: Address4 | Address6,
		dappAccount: string,
	): Promise<boolean> {
		// get matching IP rules
		const rule = await checkIpRules(db, ipAddress, dappAccount);

		return rule?.hardBlock ?? false;
	}

	protected async isUserBlocked(
		db: IProviderDatabase,
		userAccount: string,
		dappAccount: string,
	): Promise<boolean> {
		// get matching user rules
		const userRule = await checkUserRules(db, userAccount, dappAccount);

		return userRule?.hardBlock ?? false;
	}
}

export { BlockMiddleware };
