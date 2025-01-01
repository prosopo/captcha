import { describe, expect, it } from "vitest";
import { ImageCaptchaConfigResolver } from "../../../../tasks/imgCaptcha/imageCaptchaConfigResolver.js";
import type {
	RuleFilters,
	RuleFilterSettings,
	UserAccessRuleRecord,
	UserAccessRulesStorage,
} from "@prosopo/types-database";
import type { ProsopoCaptchaCountConfigSchemaOutput } from "@prosopo/types";
import { Address4 } from "ip-address";
class ImageCaptchaConfigResolverTester {
	constructor(private readonly resolver: ImageCaptchaConfigResolver) {}

	public async test(): Promise<void> {
		const tests = this.getTests();

		for (const test of tests) {
			it(test.name, async () => {
				await test.method();
			});
		}
	}

	protected getTests(): {
		name: string;
		method: () => Promise<void>;
	}[] {
		return [
			{
				name: "resolvesFromUserAccessRule",
				method: () => this.resolvesFromUserAccessRule(),
			},
			{
				name: "resolvesFromClientUserAccessRuleWhenBothClientAndGlobalRulesFound",
				method: () =>
					this.resolvesFromClientUserAccessRuleWhenBothClientAndGlobalRulesFound(),
			},
			{
				name: "resolvesDefaultWhenNoUserAccessRulesFound",
				method: () => this.resolvesDefaultWhenNoUserAccessRulesFound(),
			},
		];
	}

	protected async resolvesFromUserAccessRule(): Promise<void> {
		// given
		const userAccessRuleRecord: UserAccessRuleRecord = {
			isUserBlocked: false,
			config: {
				imageCaptcha: {
					solvedCount: 10,
					unsolvedCount: 11,
				},
			},
			_id: "0",
		};

		const userAccessRulesStorage = this.mockUserAccessRulesStorage([
			userAccessRuleRecord,
		]);

		const defaultConfig: ProsopoCaptchaCountConfigSchemaOutput = {
			solved: { count: 2 },
			unsolved: { count: 3 },
		};

		// when
		const resolvedConfig = await this.resolver.resolveConfig(
			userAccessRulesStorage,
			defaultConfig,
			new Address4("127.0.0.1"),
			"userId",
			"clientId",
		);

		// then
		expect(resolvedConfig.solved.count).toBe(
			userAccessRuleRecord.config?.imageCaptcha?.solvedCount,
		);
		expect(resolvedConfig.unsolved.count).toBe(
			userAccessRuleRecord.config?.imageCaptcha?.unsolvedCount,
		);
	}

	protected async resolvesFromClientUserAccessRuleWhenBothClientAndGlobalRulesFound(): Promise<void> {
		// given
		const globalUserAccessRuleRecord: UserAccessRuleRecord = {
			isUserBlocked: false,
			config: {
				imageCaptcha: {
					solvedCount: 20,
					unsolvedCount: 21,
				},
			},
			_id: "1",
		};
		const clientUserAccessRuleRecord: UserAccessRuleRecord = {
			isUserBlocked: false,
			clientId: "client",
			config: {
				imageCaptcha: {
					solvedCount: 10,
					unsolvedCount: 11,
				},
			},
			_id: "2",
		};

		const userAccessRulesStorage = this.mockUserAccessRulesStorage([
			globalUserAccessRuleRecord,
			clientUserAccessRuleRecord,
		]);

		const defaultConfig: ProsopoCaptchaCountConfigSchemaOutput = {
			solved: { count: 2 },
			unsolved: { count: 3 },
		};

		// when
		const resolvedConfig = await this.resolver.resolveConfig(
			userAccessRulesStorage,
			defaultConfig,
			new Address4("127.0.0.1"),
			"userId",
			"clientId",
		);

		// then
		expect(resolvedConfig.solved.count).toBe(
			clientUserAccessRuleRecord.config?.imageCaptcha?.solvedCount,
		);
		expect(resolvedConfig.unsolved.count).toBe(
			clientUserAccessRuleRecord.config?.imageCaptcha?.unsolvedCount,
		);
	}

	protected async resolvesDefaultWhenNoUserAccessRulesFound(): Promise<void> {
		// given
		const userAccessRulesStorage = this.mockUserAccessRulesStorage([]);

		const defaultConfig: ProsopoCaptchaCountConfigSchemaOutput = {
			solved: { count: 2 },
			unsolved: { count: 3 },
		};

		// when
		const resolvedConfig = await this.resolver.resolveConfig(
			userAccessRulesStorage,
			defaultConfig,
			new Address4("127.0.0.1"),
			"userId",
			"clientId",
		);

		// then
		expect(resolvedConfig.solved.count).toBe(defaultConfig.solved.count);
		expect(resolvedConfig.unsolved.count).toBe(defaultConfig.unsolved.count);
	}

	protected mockUserAccessRulesStorage(
		ruleRecords: UserAccessRuleRecord[],
	): UserAccessRulesStorage {
		return {
			find(
				clientId: string | null,
				filters?: RuleFilters | null,
				filterSettings?: RuleFilterSettings | null,
			): Promise<UserAccessRuleRecord[]> {
				return Promise.resolve(ruleRecords);
			},
		};
	}
}

describe("ImageCaptchaConfigResolver", () => {
	const imageCaptchaConfigResolver = new ImageCaptchaConfigResolver();

	const imageCaptchaConfigResolverTester = new ImageCaptchaConfigResolverTester(
		imageCaptchaConfigResolver,
	);

	imageCaptchaConfigResolverTester.test();
});
