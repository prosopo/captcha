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
import type { NextFunction, Request, Response } from "express";
import { getIPAddress } from "../util.js";
import type { RequestRulesInspector } from "@prosopo/user-access-policy";

class BlacklistRequestInspector {
	public constructor(
		private readonly requestRulesInspector: RequestRulesInspector,
		private readonly environmentReadinessWaiter: () => Promise<void>,
		private readonly logger: Logger | null,
	) {}

	public async abortRequestForBlockedUsers(
		request: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		const rawIp = request.ip || "";

		const shouldAbortRequest = await this.shouldAbortRequest(
			request.url,
			rawIp,
			request.headers,
			request.body,
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
		requestHeaders: Record<string, unknown>,
		requestBody: Record<string, unknown>,
	): Promise<boolean> {
		// Skip this middleware for non-api routes like /json /favicon.ico etc
		if (this.isApiUnrelatedRoute(requestedRoute)) {
			return false;
		}

		// block if no IP is present
		if (!rawIp) {
			this.logger?.info("Request without IP", {
				requestedRoute: requestedRoute,
				requestHeaders: requestHeaders,
				requestBody: requestBody,
			});

			return true;
		}

		await this.environmentReadinessWaiter();

		try {
			const ipAddress = getIPAddress(rawIp);

			return await this.requestRulesInspector.shouldAbortRequest(
				ipAddress,
				requestHeaders,
				requestBody,
			);
		} catch (err) {
			this.logger?.error("Block Middleware Error:", err);

			return true;
		}
	}

	protected isApiUnrelatedRoute(url: string): boolean {
		return -1 === url.indexOf(ApiPrefix);
	}
}

export { BlacklistRequestInspector };
