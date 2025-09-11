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
import { ProviderApi } from "@prosopo/api";
import { loadBalancer } from "@prosopo/load-balancer";
import {
	CaptchaType,
	EnvironmentTypesSchema,
	type KeyringPair,
} from "@prosopo/types";
import {
	AccessPolicyType,
	type InsertManyRulesEndpointOutputSchema,
	type UserScopeApiInput,
} from "@prosopo/user-access-policy";
import { u8aToHex } from "@prosopo/util";

export const removeAllUserAccessPolicies = async (adminPair: KeyringPair) => {
	const providers = await loadBalancer(EnvironmentTypesSchema.enum.development);
	const responses = [];
	for (const provider of providers) {
		const providerApi = new ProviderApi(provider.url, adminPair.address);

		responses.push(
			providerApi.deleteAllUserAccessPolicies(adminPair.jwtIssue()),
		);
	}
	return Promise.all(responses);
};

export const userAccessPolicy = async (
	adminPair: KeyringPair,
	options: {
		client?: string;
		block?: boolean;
		ip?: string;
		ja4?: string;
		userId?: string;
		userAgent?: string;
		description?: string;
		score?: number;
		solved?: number;
		unsolved?: number;
		expiration?: number;
		captchaType?: CaptchaType;
		powDifficulty?: number;
	},
) => {
	const providers = await loadBalancer(EnvironmentTypesSchema.enum.development);
	for (const provider of providers) {
		const timestamp = Date.now();
		const signature = u8aToHex(adminPair.sign(timestamp.toString()));
		const {
			client,
			block,
			ip,
			ja4,
			userId,
			userAgent,
			description,
			score,
			solved,
			expiration,
			captchaType = CaptchaType.image,
			powDifficulty,
		} = options;

		const accessPolicyBody: InsertManyRulesEndpointOutputSchema = {
			accessPolicy: {
				...(block
					? { type: AccessPolicyType.Block }
					: {
							type: AccessPolicyType.Restrict,
							captchaType: captchaType,
							...(solved && { solvedImagesCount: solved }),
							...(powDifficulty && { powDifficulty: powDifficulty }),
						}),
				...(description && { description: description }),
				...(score && { frictionlessScore: score }),
			},
			policyScope: {
				...(client && { clientId: client }),
			},
			userScopes: [
				{
					...(ip && { ip: ip }),
					...(ja4 && { ja4Hash: ja4 }),
					...(userId && { userId: userId }),
					...(userAgent && { userAgent }),
				} as UserScopeApiInput,
			],
			expirationTimestamp:
				expiration !== undefined
					? expiration
					: new Date().getTime() + 24 * 60 * 60 * 1000,
		};

		const providerApi = new ProviderApi(provider.url, adminPair.address);

		const response = await providerApi.insertUserAccessPolicies(
			accessPolicyBody,
			adminPair.jwtIssue(),
		);

		console.log(response);
	}
};
