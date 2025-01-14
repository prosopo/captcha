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
	IPAddress,
	ProsopoCaptchaCountConfigSchemaOutput,
} from "@prosopo/types";
import type { ImageCaptchaConfig } from "@rules/rule/config/imageCaptcha/imageCaptchaConfig.js";
import type { Rule } from "@rules/rule/rule.js";
import type { RulesStorage } from "@rules/storage/rulesStorage.js";
import type { ImageCaptchaConfigResolver } from "../imageCaptchaConfigResolver.js";

class ImageCaptchaConfigRulesResolver implements ImageCaptchaConfigResolver {
	public constructor(private readonly rulesStorage: RulesStorage) {}

	public async isConfigDefined(
		clientId: string,
		userIpAddress: IPAddress,
		userId: string,
	): Promise<boolean> {
		const accessRule = await this.fetchUserAccessRule(
			userIpAddress,
			userId,
			clientId,
		);

		const imageCaptchaConfig = accessRule?.config?.imageCaptcha || null;

		return null !== imageCaptchaConfig;
	}

	public async resolveConfig(
		defaults: ProsopoCaptchaCountConfigSchemaOutput,
		userIpAddress: IPAddress,
		userId: string,
		clientId: string,
	): Promise<ProsopoCaptchaCountConfigSchemaOutput> {
		const accessRule = await this.fetchUserAccessRule(
			userIpAddress,
			userId,
			clientId,
		);

		if (null === accessRule) {
			return defaults;
		}

		const imageCaptchaConfig = accessRule.config?.imageCaptcha || {};

		return this.getImageCaptchaConfig(defaults, imageCaptchaConfig);
	}

	protected async fetchUserAccessRule(
		userIpAddress: IPAddress,
		userId: string,
		clientId: string,
	): Promise<Rule | null> {
		const accessRules = await this.queryUserAccessRules(
			userIpAddress,
			userId,
			clientId,
		);

		return this.selectPrimaryUserAccessRule(accessRules);
	}

	protected async queryUserAccessRules(
		ipAddress: IPAddress,
		user: string,
		clientId: string,
	): Promise<Rule[]> {
		return await this.rulesStorage.find(
			{
				clientId: clientId,
				userId: user,
				userIpAddress: ipAddress,
			},
			{
				includeRecordsWithoutClientId: true,
				includeRecordsWithPartialFilterMatches: true,
			},
		);
	}

	protected selectPrimaryUserAccessRule(accessRules: Rule[]): Rule | null {
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
		imageCaptchaConfig: ImageCaptchaConfig,
	): ProsopoCaptchaCountConfigSchemaOutput {
		return {
			solved: {
				count: imageCaptchaConfig.solvedCount || defaults.solved.count,
			},
			unsolved: {
				count: imageCaptchaConfig.unsolvedCount || defaults.unsolved.count,
			},
		};
	}
}

export { ImageCaptchaConfigRulesResolver };
