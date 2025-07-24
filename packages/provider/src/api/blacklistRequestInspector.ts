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
	AccessPolicyType,
	type AccessRulesStorage,
	ScopeMatch,
	type UserScopeApiInput,
	type UserScopeApiOutput,
	userScopeInputSchema,
} from "@prosopo/user-access-policy";
import { uniqueSubsets } from "@prosopo/util";
import type { NextFunction, Request, Response } from "express";

export const getRequestUserScope = (
	requestHeaders: Record<string, unknown>,
	ja4?: string,
	ip?: string,
	user?: string,
): Pick<UserScopeApiInput, "userId" | "ja4Hash" | "userAgent" | "ip"> => {
	const userAgent = requestHeaders["user-agent"]
		? requestHeaders["user-agent"].toString()
		: undefined;
	return {
		...(user && { userId: user }),
		...(ja4 && { ja4Hash: ja4 }),
		...(userAgent && { userAgent: userAgent }),
		...(ip && { ip }),
		// TODO more things with headers
	};
};

const getPrioritisedUserScopes = (userScope: {
	[key: string]: bigint | string;
}): Record<string, bigint | string | undefined>[] => {
	const userScopeKeys = Object.keys(userScope);
	return uniqueSubsets(userScopeKeys).map((subset: string[]) =>
		subset.reduce(
			(acc, key) => {
				acc[key] = userScope[key];
				return acc;
			},
			{} as Record<string, bigint | string | undefined>,
		),
	);
};

export const getPrioritisedAccessRule = async (
	userAccessRulesStorage: AccessRulesStorage,
	userScope: {
		[key in keyof UserScopeApiInput & UserScopeApiOutput]?: bigint | string;
	},
	clientId?: string,
) => {
	const prioritisedUserScopes = getPrioritisedUserScopes(userScope);
	const policyPromises = [];
	// Search first by clientId, if it exists, then by undefined clientId. Otherwise, just search by undefined clientId.
	const clientLoop = clientId ? [clientId, undefined] : [undefined];
	for (const clientOrUndefined of clientLoop) {
		for (const scope of prioritisedUserScopes) {
			if (Object.values(scope).every((value) => value === undefined)) {
				continue;
			}

			const parsedUserScope = userScopeInputSchema.parse(scope);

			const filter = {
				...(clientOrUndefined && {
					policyScope: {
						clientId: clientOrUndefined,
					},
				}),
				policyScopeMatch: ScopeMatch.Exact,

				userScope: parsedUserScope,

				userScopeMatch: ScopeMatch.Exact,
			};

			policyPromises.push(userAccessRulesStorage.findRules(filter, true, true));
		}
	}
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
