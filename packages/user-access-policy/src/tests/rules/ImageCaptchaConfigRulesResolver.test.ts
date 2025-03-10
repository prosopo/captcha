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

import type { ProsopoCaptchaCountConfigSchemaOutput } from "@prosopo/types";
import { Address4 } from "ip-address";
import { describe, expect, it } from "vitest";
import { ImageCaptchaConfigRulesResolver } from "../../rules/imageCaptchaConfigRulesResolver.js";
import type { RuleRecord } from "../../rules/storage/ruleRecord.js";
import { loggerMockedInstance } from "./loggerMockedInstance.js";
import { TestRulesStorage } from "./storage/testRulesStorage.js";

describe("ImageCaptchaConfigResolver", () => {
	it("resolvesFromUserAccessRule", async () => {
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
		const resolver = new ImageCaptchaConfigRulesResolver(
			userAccessRulesStorage,
			loggerMockedInstance,
		);

		const defaultConfig: ProsopoCaptchaCountConfigSchemaOutput = {
			solved: { count: 2 },
			unsolved: { count: 3 },
		};

		// when
		const resolvedConfig = await resolver.resolveConfig(
			defaultConfig,
			new Address4("127.0.0.1"),
			"",
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
	});

	it("resolvesFromClientUserAccessRuleWhenBothClientAndGlobalRulesFound", async () => {
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
		const resolver = new ImageCaptchaConfigRulesResolver(
			userAccessRulesStorage,
			loggerMockedInstance,
		);

		const defaultConfig: ProsopoCaptchaCountConfigSchemaOutput = {
			solved: { count: 2 },
			unsolved: { count: 3 },
		};

		// when
		const resolvedConfig = await resolver.resolveConfig(
			defaultConfig,
			new Address4("127.0.0.1"),
			"",
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
	});

	it("resolvesDefaultWhenNoUserAccessRulesFound", async () => {
		// given
		const userAccessRulesStorage = new TestRulesStorage([]);
		const resolver = new ImageCaptchaConfigRulesResolver(
			userAccessRulesStorage,
			loggerMockedInstance,
		);

		const defaultConfig: ProsopoCaptchaCountConfigSchemaOutput = {
			solved: { count: 2 },
			unsolved: { count: 3 },
		};

		// when
		const resolvedConfig = await resolver.resolveConfig(
			defaultConfig,
			new Address4("127.0.0.1"),
			"",
			"userId",
			"clientId",
		);

		// then
		expect(resolvedConfig.solved.count).toBe(defaultConfig.solved.count);
		expect(resolvedConfig.unsolved.count).toBe(defaultConfig.unsolved.count);
	});
});
