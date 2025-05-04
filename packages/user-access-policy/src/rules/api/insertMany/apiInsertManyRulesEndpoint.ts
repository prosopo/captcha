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

import {
	type ApiEndpoint,
	type ApiEndpointResponse,
	ApiEndpointResponseStatus,
} from "@prosopo/api-route";
import { Address4, Address6 } from "ip-address";
import type { z } from "zod";
import { ruleIpSchema } from "../../rule/ip/ruleIpSchema.js";
import type { Rule } from "../../rule/rule.js";
import type { RulesStorage } from "../../storage/rulesStorage.js";
import {
	type ApiInsertManyRulesArgs,
	apiInsertManyRulesArgsSchema,
} from "./apiInsertManyRulesArgs.js";

class ApiInsertManyRulesEndpoint
	implements ApiEndpoint<ApiInsertManyRulesArgs>
{
	public constructor(private readonly rulesStorage: RulesStorage) {}

	async processRequest(
		args: z.infer<ApiInsertManyRulesArgs>,
	): Promise<ApiEndpointResponse> {
		const singleRule = this.getSingleRule(args);
		const rules: Rule[] = [
			...this.getUserIpRules(args),
			...this.getUserIPMaskRules(args),
			...this.getUserIdRules(args),
			...this.getJa4Rules(args),
			...(singleRule ? [singleRule] : []),
		];

		// either return after 5s or when the rules are inserted or fail to insert
		return new Promise((resolve) => {
			this.rulesStorage
				.insertMany(rules)
				.then(() => {
					resolve({
						status: ApiEndpointResponseStatus.SUCCESS,
					});
				})
				.catch((e) => {
					resolve({
						status: ApiEndpointResponseStatus.FAIL,
					});
				});
			setTimeout(() => {
				resolve({
					status: ApiEndpointResponseStatus.PROCESSING,
				});
			}, 5000);
		});
	}

	public getRequestArgsSchema(): ApiInsertManyRulesArgs {
		return apiInsertManyRulesArgsSchema;
	}

	protected getUserIpRules(args: z.infer<ApiInsertManyRulesArgs>): Rule[] {
		const rules: Rule[] = [];

		const userIps = args.userIps || [];
		for (const userIp of userIps.v4 || []) {
			const ipAddress = new Address4(userIp);
			rules.push({
				userIp: ruleIpSchema.parse({
					v4: {
						asNumeric: ipAddress.bigInt(),
						asString: ipAddress.address,
					},
				}),
				isUserBlocked: args.isUserBlocked,
				description: args.description,
				clientId: args.clientId,
				config: args.config,
				score: args.score,
			});
		}
		for (const userIp of userIps.v6 || []) {
			const ipAddress = new Address6(userIp);
			rules.push({
				userIp: ruleIpSchema.parse({
					v4: {
						asNumeric: ipAddress.bigInt(),
						asString: ipAddress.address,
					},
				}),
				isUserBlocked: args.isUserBlocked,
				description: args.description,
				clientId: args.clientId,
				config: args.config,
				score: args.score,
			});
		}

		return rules;
	}

	protected getUserIPMaskRules(args: z.infer<ApiInsertManyRulesArgs>): Rule[] {
		const rules: Rule[] = [];
		const userIpMasks = args.userIpMasks || [];
		for (const userMask of userIpMasks.v4 || []) {
			const min = new Address4(userMask.min);
			const max = new Address4(userMask.max);
			rules.push({
				userIp: ruleIpSchema.parse({
					v4: {
						asNumeric: min.bigInt(),
						asString: min.address,
						mask: {
							rangeMinAsNumeric: min.bigInt(),
							rangeMaxAsNumeric: max.bigInt(),
							asNumeric: Number(min.bigInt()),
						},
					},
				}),
				isUserBlocked: args.isUserBlocked,
				description: args.description,
				clientId: args.clientId,
				config: args.config,
				score: args.score,
			});
		}
		for (const userMask of userIpMasks.v6 || []) {
			const min = new Address6(userMask.min);
			const max = new Address6(userMask.max);
			rules.push({
				userIp: ruleIpSchema.parse({
					v6: {
						asNumeric: min.bigInt(),
						asString: min.address,
						mask: {
							rangeMinAsNumeric: min.bigInt(),
							rangeMaxAsNumeric: max.bigInt(),
							asNumeric: Number(min.bigInt()),
						},
					},
				}),
				isUserBlocked: args.isUserBlocked,
				description: args.description,
				clientId: args.clientId,
				config: args.config,
				score: args.score,
			});
		}
		return rules;
	}

	protected getUserIdRules(args: z.infer<ApiInsertManyRulesArgs>): Rule[] {
		const rules: Rule[] = [];

		const userIds = args.userIds || [];

		for (const userId of userIds) {
			rules.push({
				userId: userId,
				isUserBlocked: args.isUserBlocked,
				description: args.description,
				clientId: args.clientId,
				config: args.config,
				score: args.score,
			});
		}

		return rules;
	}

	protected getJa4Rules(args: z.infer<ApiInsertManyRulesArgs>): Rule[] {
		const rules: Rule[] = [];

		const ja4s = args.ja4s || [];

		for (const ja4 of ja4s) {
			rules.push({
				ja4: ja4,
				isUserBlocked: args.isUserBlocked,
				description: args.description,
				clientId: args.clientId,
				config: args.config,
				score: args.score,
			});
		}

		return rules;
	}

	protected getSingleRule(
		args: z.infer<ApiInsertManyRulesArgs>,
	): Rule | undefined {
		if (!args.userIp && !args.userId && !args.ja4) {
			return undefined;
		}
		const rule: Rule = {
			isUserBlocked: args.isUserBlocked,
			...(args.description && { description: args.description }),
			...(args.clientId && { clientId: args.clientId }),
			...(args.config && { config: args.config }),
			...(args.score && { score: args.score }),
			...(args.ja4 && { ja4: args.ja4 }),
			...(args.userId && { userId: args.userId }),
		};
		if (args.userIp) {
			const userIp = args.userIp;
			if (userIp.v4) {
				const ipAddress = new Address4(userIp.v4);
				rule.userIp = ruleIpSchema.parse({
					v4: {
						asNumeric: ipAddress.bigInt(),
						asString: ipAddress.address,
					},
				});
			}
			if (userIp.v6) {
				const ipAddress = new Address6(userIp.v6);
				rule.userIp = ruleIpSchema.parse({
					v6: {
						asNumeric: ipAddress.bigInt(),
						asString: ipAddress.address,
					},
				});
			}
		}

		return rule;
	}
}

export { ApiInsertManyRulesEndpoint };
