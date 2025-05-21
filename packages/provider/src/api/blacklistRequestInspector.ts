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
import {
	type ResolveAccessPolicy,
	ScopeMatch,
} from "@prosopo/user-access-policy";
import { AccessPolicyType } from "@prosopo/user-access-policy";
import { getIPAddress } from "@prosopo/util";
import type { NextFunction, Request, Response } from "express";

export class BlacklistRequestInspector {
	public constructor(
		private readonly resolveAccessPolicy: ResolveAccessPolicy,
		private readonly environmentReadinessWaiter: () => Promise<void>,
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

			const accessPolicy = await this.resolveAccessPolicy({
				policyScope: {
					clientId: clientId,
				},
				policyScopeMatch: ScopeMatch.Greedy,
				userScope: {
					userId: userId,
					numericIp: userIpAddress.bigInt(),
					ja4Hash: ja4,
				},
				userScopeMatch: ScopeMatch.Greedy,
			});

			return AccessPolicyType.Block === accessPolicy?.type;
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
		userId: string | undefined;
		clientId: string | undefined;
	} {
		const userId =
			this.getObjectValue(requestHeaders, "Prosopo-User") ||
			this.getObjectValue(requestBody, "user");
		const clientId =
			this.getObjectValue(requestHeaders, "Prosopo-Site-Key") ||
			this.getObjectValue(requestBody, "dapp");

		return {
			userId: "string" === typeof userId ? userId : undefined,
			clientId: "string" === typeof clientId ? clientId : undefined,
		};
	}

	protected getObjectValue(
		object: Record<string, unknown>,
		key: string,
	): unknown {
		return object[key];
	}
}
