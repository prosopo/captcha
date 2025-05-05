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
import type {
	IPAddress,
	ProsopoCaptchaCountConfigSchemaOutput,
} from "@prosopo/types";
import type { ImageCaptchaConfigResolver } from "../imageCaptchaConfigResolver.js";
import type { ImageCaptchaConfig } from "./rule/config/imageCaptcha/imageCaptchaConfig.js";
import type { Rule } from "./rule/rule.js";
import type { RulesStorage } from "./storage/rulesStorage.js";

class ImageCaptchaConfigRulesResolver implements ImageCaptchaConfigResolver {
	public constructor(
		private readonly rulesStorage: RulesStorage,
		private readonly logger: Logger,
		private _accessRule: Rule | null = null,
	) {}

	get accessRule(): Rule | null {
		return this._accessRule;
	}

	public async isConfigDefined(
		clientId: string,
		userIpAddress: IPAddress,
		ja4: string,
		userId: string,
	): Promise<boolean> {
		const accessRule = await this.fetchUserAccessRule(
			userIpAddress,
			ja4,
			userId,
			clientId,
		);

		const imageCaptchaConfig = accessRule?.config?.imageCaptcha || null;

		const configDefined = null !== imageCaptchaConfig;

		if (configDefined) {
			this.logger.info({
				configDefined: configDefined,
				clientId: clientId,
				userIpAddress: userIpAddress.toString(),
				userId: userId,
				imageCaptchaConfig: imageCaptchaConfig,
				ja4,
			});
		}

		return configDefined;
	}

	public async resolveConfig(
		defaults: ProsopoCaptchaCountConfigSchemaOutput,
		userIpAddress: IPAddress,
		ja4: string,
		userId: string,
		clientId: string,
	): Promise<ProsopoCaptchaCountConfigSchemaOutput> {
		const logArgs = {
			userIpAddress: userIpAddress.address.toString(),
			userId: userId,
			clientId: clientId,
			defaults: defaults,
			ja4,
		};

		this._accessRule = await this.fetchUserAccessRule(
			userIpAddress,
			ja4,
			userId,
			clientId,
		);

		if (null === this.accessRule) {
			this.logger.debug("ImageCaptchaConfigRulesResolver.resolveConfig", {
				configDefined: false,
				...logArgs,
			});

			return defaults;
		}

		const imageCaptchaConfig = this.accessRule.config?.imageCaptcha || {};

		const config = this.getImageCaptchaConfig(defaults, imageCaptchaConfig);

		this.logger.info("ImageCaptchaConfigRulesResolver.resolveConfig", {
			configDefined: true,
			imageCaptchaConfig: imageCaptchaConfig,
			config: config,
			...logArgs,
		});

		return config;
	}

	protected async fetchUserAccessRule(
		userIpAddress: IPAddress,
		ja4: string,
		userId: string,
		clientId: string,
	): Promise<Rule | null> {
		const accessRules = await this.queryUserAccessRules(
			userIpAddress,
			ja4,
			userId,
			clientId,
		);

		this.logger.debug("ImageCaptchaConfigRulesResolver.fetchUserAccessRule", {
			accessRules: accessRules.length,
			userIpAddress: userIpAddress.address.toString(),
			userId: userId,
			clientId: clientId,
			ja4,
		});

		return this.selectPrimaryUserAccessRule(accessRules);
	}

	protected async queryUserAccessRules(
		ipAddress: IPAddress,
		ja4: string,
		user: string,
		clientId: string,
	): Promise<Rule[]> {
		return await this.rulesStorage.find(
			{
				clientId: clientId,
				userId: user,
				userIpAddress: ipAddress,
				ja4: ja4,
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
