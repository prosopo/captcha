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
import type { Logger } from "@prosopo/common";
import { ApiPrefix } from "@prosopo/types";
import type { BlacklistInspector } from "@prosopo/user-access-policy";
import type { NextFunction, Request, Response } from "express";
import { getIPAddress } from "../util.js";

class BlacklistRequestInspector {
	public constructor(
		private readonly blacklistInspector: BlacklistInspector,
		private readonly environmentReadinessWaiter: () => Promise<void>,
		private readonly logger: Logger,
	) {}

	public async abortRequestForBlockedUsers(
		request: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		const rawIp = request.ip || "";

		request.logger.debug("JA4", request.ja4);

		const shouldAbortRequest = await this.shouldAbortRequest(
			request.url,
			rawIp,
			request.ja4,
			request.headers,
			request.body,
			request.logger,
		);

		if (shouldAbortRequest) {
			res.status(401).json({ error: "Unauthorized" });
			return;
		}

		next();
	}

	public async shouldAbortRequest(
		requestedRoute: string,
		rawIp: string,
		ja4: string,
		requestHeaders: Record<string, unknown>,
		requestBody: Record<string, unknown>,
		logger: Logger,
	): Promise<boolean> {
		// Skip this middleware for non-api routes like /json /favicon.ico etc
		if (this.isApiUnrelatedRoute(requestedRoute)) {
			return false;
		}

		// block if no IP is present
		if (!rawIp) {
			logger.info("Request without IP", {
				requestedRoute: requestedRoute,
				requestHeaders: requestHeaders,
				requestBody: requestBody,
			});

			return true;
		}

		await this.environmentReadinessWaiter();

		try {
			const userIpAddress = getIPAddress(rawIp);

			const { userId, clientId } = this.extractIdsFromRequest(
				requestHeaders,
				requestBody,
			);

			return await this.blacklistInspector.isUserBlacklisted(
				clientId,
				userIpAddress,
				ja4,
				userId,
			);
		} catch (err) {
			logger.error("Block Middleware Error:", err);

			return true;
		}
	}

	protected isApiUnrelatedRoute(url: string): boolean {
		return !url.includes(ApiPrefix);
	}

	protected extractIdsFromRequest(
		requestHeaders: Record<string, unknown>,
		requestBody: Record<string, unknown>,
	): {
		userId: string;
		clientId: string;
	} {
		const userId =
			this.getObjectValue(requestHeaders, "Prosopo-User") ||
			this.getObjectValue(requestBody, "user") ||
			"";
		const clientId =
			this.getObjectValue(requestHeaders, "Prosopo-Site-Key") ||
			this.getObjectValue(requestBody, "dapp") ||
			"";

		return {
			userId: "string" === typeof userId ? userId : "",
			clientId: "string" === typeof clientId ? clientId : "",
		};
	}

	protected getObjectValue(
		object: Record<string, unknown>,
		key: string,
	): unknown {
		return object[key];
	}
}

export { BlacklistRequestInspector };
