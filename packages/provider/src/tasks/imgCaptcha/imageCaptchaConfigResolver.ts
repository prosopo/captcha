import type {
	ImageCaptchaAccessRule,
	IProviderDatabase,
	UserAccessRule,
	UserAccessRulesStorage,
} from "@prosopo/types-database";
import type {
	IPAddress,
	ProsopoCaptchaCountConfigSchemaOutput,
	ProsopoConfigOutput,
} from "@prosopo/types";

class ImageCaptchaConfigResolver {
	public async resolveConfig(
		userAccessRulesStorage: UserAccessRulesStorage,
		defaultConfig: ProsopoConfigOutput,
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
			return defaultConfig.captchas;
		}

		const imageCaptchaAccessRule = accessRule.config?.imageCaptcha || {};

		return this.getImageCaptchaConfig(defaultConfig, imageCaptchaAccessRule);
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
		defaultConfig: ProsopoConfigOutput,
		imageCaptchaAccessRule: ImageCaptchaAccessRule,
	): ProsopoCaptchaCountConfigSchemaOutput {
		const defaultSolvedCount = defaultConfig.captchas.solved.count;
		const defaultUnsolvedCount = defaultConfig.captchas.unsolved.count;

		return {
			solved: {
				count: imageCaptchaAccessRule.solvedCount || defaultSolvedCount,
			},
			unsolved: {
				count: imageCaptchaAccessRule.unsolvedCount || defaultUnsolvedCount,
			},
		};
	}
}

export { ImageCaptchaConfigResolver };
