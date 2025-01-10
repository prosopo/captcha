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
import type { ProsopoCaptchaCountConfigSchemaOutput } from "@prosopo/types";
import { Address4 } from "ip-address";
import { describe, expect } from "vitest";
import {TestsBase} from "@tests/testsBase.js";
import {TestRulesStorage} from "@tests/rules/storage/testRulesStorage.js";
import {ImageCaptchaConfigResolver} from "@imageCaptchaConfig/resolver/imageCaptchaConfigResolver.js";
import type {RuleRecord} from "@rules/storage/ruleRecord.js";

class TestImageCaptchaConfigResolver extends TestsBase {
	constructor(private readonly resolver: ImageCaptchaConfigResolver) {
		super();
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
		const userAccessRuleRecord: RuleRecord = {
			isUserBlocked: false,
			config: {
				imageCaptcha: {
					solvedCount: 10,
					unsolvedCount: 11,
				},
			},
			_id: "0",
		};

		const userAccessRulesStorage = new TestRulesStorage([userAccessRuleRecord]);

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
		const globalUserAccessRuleRecord: RuleRecord = {
			isUserBlocked: false,
			config: {
				imageCaptcha: {
					solvedCount: 20,
					unsolvedCount: 21,
				},
			},
			_id: "0",
		};
		const clientUserAccessRuleRecord: RuleRecord = {
			isUserBlocked: false,
			clientId: "client",
			config: {
				imageCaptcha: {
					solvedCount: 10,
					unsolvedCount: 11,
				},
			},
			_id: "1",
		};

		const userAccessRulesStorage = new TestRulesStorage([
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
		const userAccessRulesStorage = new TestRulesStorage([]);

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
}

describe("ImageCaptchaConfigResolver", () => {
	const imageCaptchaConfigResolverTester = new TestImageCaptchaConfigResolver(
		new ImageCaptchaConfigResolver(),
	);

	imageCaptchaConfigResolverTester.runAll();
});
