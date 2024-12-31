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
import { checkUserRules } from "../rules/user.js";
import { getIPAddress } from "../util.js";
import type { IProviderDatabase } from "@prosopo/types-database";
import type { Address4, Address6 } from "ip-address";

class BlacklistRequestInspector {
	public constructor(
		private readonly providerEnvironment: ProviderEnvironment,
		private readonly logger: Logger,
	) {}

	public static createMiddleware(
		providerEnvironment: ProviderEnvironment,
		logger: Logger,
	) {
		const blacklistInspector = new BlacklistRequestInspector(
			providerEnvironment,
			logger,
		);

		return blacklistInspector.abortRequestForBlacklisted.bind(
			blacklistInspector,
		);
	}

	public async abortRequestForBlacklisted(
		request: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		// Run this middleware only on non-api routes like /json /favicon.ico etc
		if (this.isApiRoute(request.url)) {
			const rawIp = request.ip || "";
			const shouldAbortRequest = await this.shouldAbortRequest(rawIp, request);

			if (shouldAbortRequest) {
				res.status(401).json({ error: "Unauthorized" });
				return;
			}
		}

		next();
	}

	protected isApiRoute(url: string): boolean {
		return -1 !== url.indexOf(ApiPrefix);
	}

	protected async shouldAbortRequest(
		rawIp: string,
		request: Request,
	): Promise<boolean> {
		// if no IP block
		if (!rawIp) {
			this.logger.info("No IP");

			return true;
		}

		try {
			const ipAddress = getIPAddress(rawIp);

			return await this.isRequestFromBlacklisted(ipAddress, request);
		} catch (err) {
			this.logger.error("Block Middleware Error:", err);

			return true;
		}
	}

	protected async isRequestFromBlacklisted(
		ipAddress: Address4 | Address6,
		request: Request,
	): Promise<boolean> {
		const { userAccount, dappAccount } = this.extractIdsFromRequest(request);
		const clientAccountId = dappAccount ? dappAccount : null;
		const db = this.providerEnvironment.getDb();

		const blacklistChecks = [
			async () => await this.isIpInBlacklist(db, ipAddress, clientAccountId),
			async () => await this.isUserInBlacklist(db, userAccount, dappAccount),
		];

		await this.providerEnvironment.isReady();

		for (const blacklistCheck of blacklistChecks) {
			const blacklisted = await blacklistCheck();

			if (blacklisted) {
				return true;
			}
		}

		return false;
	}

	protected extractIdsFromRequest(request: Request): {
		userAccount: string;
		dappAccount: string;
	} {
		return {
			userAccount: request.headers["Prosopo-User"] || request.body.user || "",
			dappAccount:
				request.headers["Prosopo-Site-Key"] || request.body.dapp || "",
		};
	}

	protected async isIpInBlacklist(
		db: IProviderDatabase,
		ipAddress: Address4 | Address6,
		clientAccountId: string | null,
	): Promise<boolean> {
		const userAccessRules = db.getUserAccessRules();

		const accessRules = await userAccessRules.findByUserIp(
			ipAddress,
			clientAccountId,
		);

		const blockingRules = accessRules.filter(
			(accessRule) => accessRule.isUserBlocked,
		);

		return blockingRules.length > 0;
	}

	protected async isUserInBlacklist(
		db: IProviderDatabase,
		userAccount: string,
		dappAccount: string,
	): Promise<boolean> {
		// get matching user rules
		const userBlacklistRule = await checkUserRules(
			db,
			userAccount,
			dappAccount,
		);

		return userBlacklistRule?.hardBlock ?? false;
	}
}

export { BlacklistRequestInspector };
