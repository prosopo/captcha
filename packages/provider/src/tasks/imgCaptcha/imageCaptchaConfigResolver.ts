import type {
	IPAddress,
	ProsopoCaptchaCountConfigSchemaOutput,
} from "@prosopo/types";
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
import type {
	ImageCaptchaAccessRule,
	UserAccessRule,
	UserAccessRulesStorage,
} from "@prosopo/types-database";

class ImageCaptchaConfigResolver {
	public async resolveConfig(
		userAccessRulesStorage: UserAccessRulesStorage,
		defaults: ProsopoCaptchaCountConfigSchemaOutput,
		userIpAddress: IPAddress,
		userId: string,
		clientId: string,
	): Promise<ProsopoCaptchaCountConfigSchemaOutput> {
		const accessRule = await this.fetchUserAccessRule(
			userAccessRulesStorage,
			userIpAddress,
			userId,
			clientId,
		);

		if (null === accessRule) {
			return defaults;
		}

		const imageCaptchaAccessRule = accessRule.config?.imageCaptcha || {};

		return this.getImageCaptchaConfig(defaults, imageCaptchaAccessRule);
	}

	protected async fetchUserAccessRule(
		userAccessRulesStorage: UserAccessRulesStorage,
		userIpAddress: IPAddress,
		userId: string,
		clientId: string,
	): Promise<UserAccessRule | null> {
		const accessRules = await this.queryUserAccessRules(
			userAccessRulesStorage,
			userIpAddress,
			userId,
			clientId,
		);

		return this.selectPrimaryUserAccessRule(accessRules);
	}

	protected async queryUserAccessRules(
		userAccessRulesStorage: UserAccessRulesStorage,
		ipAddress: IPAddress,
		user: string,
		clientId: string,
	): Promise<UserAccessRule[]> {
		return await userAccessRulesStorage.find(
			clientId,
			{
				userId: user,
				userIpAddress: ipAddress,
			},
			{
				includeRecordsWithoutClientId: true,
				includeRecordsWithPartialFilterMatches: true,
			},
		);
	}

	protected selectPrimaryUserAccessRule(
		accessRules: UserAccessRule[],
	): UserAccessRule | null {
		const clientRules = accessRules.filter(
			(accessRule) => "string" === typeof accessRule.clientId,
		);
		const globalRules = accessRules.filter(
			(accessRule) => undefined === accessRule.clientId,
		);

		const accessRule =
			clientRules.length > 0 ? clientRules.shift() : globalRules.shift();

		return undefined === accessRule ? null : accessRule;
	}

	protected getImageCaptchaConfig(
		defaults: ProsopoCaptchaCountConfigSchemaOutput,
		imageCaptchaAccessRule: ImageCaptchaAccessRule,
	): ProsopoCaptchaCountConfigSchemaOutput {
		return {
			solved: {
				count: imageCaptchaAccessRule.solvedCount || defaults.solved.count,
			},
			unsolved: {
				count: imageCaptchaAccessRule.unsolvedCount || defaults.unsolved.count,
			},
		};
	}
}

export { ImageCaptchaConfigResolver };
