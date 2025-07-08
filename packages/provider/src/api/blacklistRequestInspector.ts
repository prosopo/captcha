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
import { ApiPrefix, type IPAddress } from "@prosopo/types";
import {
	AccessPolicyType,
	type AccessRulesStorage,
	ScopeMatch,
	userScopeInputSchema,
} from "@prosopo/user-access-policy";
import { getIPAddress, uniqueSubsets } from "@prosopo/util";
import type { NextFunction, Request, Response } from "express";

export const getRequestUserScope = (
	requestHeaders: Record<string, unknown>,
	ja4?: string,
	ip?: string,
	user?: string,
) => {
	const ipAddress = getIPAddress(ip || "");
	const userAgent = requestHeaders["user-agent"]
		? requestHeaders["user-agent"].toString()
		: undefined;
	return {
		...(user && { userId: user }),
		...(ja4 && { ja4Hash: ja4 }),
		...(userAgent && { userAgent: userAgent }),
		...(ipAddress && { ipAddress: ipAddress.bigInt() }),
	};
};

export const getPrioritisedAccessRule = async (
	userAccessRulesStorage: AccessRulesStorage,
	userScope: {
		[key: string]: bigint | string;
	},
	clientId?: string,
) => {
	const userScopeKeys = Object.keys(userScope).filter(
		(key) => userScope[key] !== undefined,
	);

	const prioritisedUserScopes = uniqueSubsets(userScopeKeys).map(
		(subset: string[]) =>
			subset.reduce(
				(acc, key) => {
					acc[key] = userScope[key];
					return acc;
				},
				{} as Record<string, bigint | string | undefined>,
			),
	);

	const policyPromises = [];
	for (const clientOrUndefined of [clientId, undefined]) {
		for (const scope of prioritisedUserScopes) {
			policyPromises.push(
				userAccessRulesStorage.findRules({
					...(clientOrUndefined && {
						policyScope: {
							clientId: clientOrUndefined,
						},
						policyScopeMatch: ScopeMatch.Exact,
					}),
					userScope: userScopeInputSchema.parse(scope),

					userScopeMatch: ScopeMatch.Exact,
				}),
			);
		}
	}
	// TODO maybe change this to Promise.race for speed.
	return (await Promise.all(policyPromises)).flat();
};

export class BlacklistRequestInspector {
	public constructor(
		private readonly userAccessRulesStorage: AccessRulesStorage,
		private readonly environmentReadinessWaiter: () => Promise<void>,
	) {}

	public async abortRequestForBlockedUsers(
		request: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		const rawIp = request.ip || "";

		console.log(`Raw IP: ${rawIp}`);

		request.logger.debug(() => ({
			data: { ja4: request.ja4 },
		}));

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
			logger.info(() => ({
				data: {
					requestedRoute: requestedRoute,
					requestHeaders: requestHeaders,
					requestBody: requestBody,
				},
				msg: "Request without IP",
			}));

			return true;
		}

		await this.environmentReadinessWaiter();

		try {
			const { userId, clientId } = this.extractIdsFromRequest(
				requestHeaders,
				requestBody,
			);

			const accessPolicies = await getPrioritisedAccessRule(
				this.userAccessRulesStorage,
				getRequestUserScope(requestHeaders, ja4, rawIp, userId),
				clientId,
			);
			if (
				!accessPolicies ||
				accessPolicies.length === 0 ||
				!accessPolicies[0]
			) {
				return false;
			}
			const accessPolicy = accessPolicies[0];

			return AccessPolicyType.Block === accessPolicy.type;
		} catch (err) {
			logger.error(() => ({
				err,
				msg: "Block Middleware Error",
			}));

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
