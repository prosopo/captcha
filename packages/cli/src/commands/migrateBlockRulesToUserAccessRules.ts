import type { KeyringPair } from "@polkadot/keyring/types";
import { ProviderEnvironment } from "@prosopo/env";
import type { BlockRule, ProsopoConfigOutput } from "@prosopo/types";
import type {
	IPBlockRuleRecord,
	UserAccessRule,
	UserAccountBlockRuleRecord,
} from "@prosopo/types-database";
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
import type { CommandModule } from "yargs";

class MigrateBlockRuleDbRecordsToUserAccessPolicyCommand
	implements CommandModule
{
	public command = "migrate-block-rules-to-user-access-rules";
	public describe = "Migrate block rules to user access rules";

	public constructor(
		private readonly pair: KeyringPair,
		private readonly config: ProsopoConfigOutput,
	) {}

	public handler = async (): Promise<void> => {
		const env = new ProviderEnvironment(this.config, this.pair);
		await env.isReady();

		const db = env.getDb();

		const ipBlockRules = await db.getAllIpBlockRules();
		const userAccountBlockRules = await db.getAllUserAccountBlockRules();

		const userAccessRulesFromIpBlockRules =
			this.convertIpBlockRulesToUserAccessRules(ipBlockRules);
		const userAccessRulesFromUserAccountBlockRules =
			this.convertUserAccountBlockRulesToUserAccessRules(userAccountBlockRules);

		const newUserAccessRules = [
			...userAccessRulesFromIpBlockRules,
			...userAccessRulesFromUserAccountBlockRules,
		];

		const userAccessRulesStorage = db.getUserAccessRulesStorage();

		await userAccessRulesStorage.insertMany(newUserAccessRules);
	};

	protected convertIpBlockRulesToUserAccessRules(
		ipBlockRules: IPBlockRuleRecord[],
	): UserAccessRule[] {
		return ipBlockRules.map((ipBlockRule) =>
			this.convertIpBlockRuleToUserAccessRule(ipBlockRule),
		);
	}

	protected convertUserAccountBlockRulesToUserAccessRules(
		userAccountBlockRules: UserAccountBlockRuleRecord[],
	): UserAccessRule[] {
		return userAccountBlockRules.map((userAccountBlockRule) =>
			this.convertUserAccountBlockRuleToUserAccessRule(userAccountBlockRule),
		);
	}

	protected convertIpBlockRuleToUserAccessRule(
		ipBlockRule: IPBlockRuleRecord,
	): UserAccessRule {
		const userAccessRule = this.convertBlockRuleToUserAccessRule(ipBlockRule);

		userAccessRule.userIp = {
			v4: {
				asNumeric: BigInt(ipBlockRule.ip),
				asString: ipBlockRule.ip.toString(),
			},
		};

		return userAccessRule;
	}

	protected convertUserAccountBlockRuleToUserAccessRule(
		userAccountBlockRule: UserAccountBlockRuleRecord,
	): UserAccessRule {
		const userAccessRule =
			this.convertBlockRuleToUserAccessRule(userAccountBlockRule);

		userAccessRule.userId = userAccountBlockRule.userAccount;

		return userAccessRule;
	}

	protected convertBlockRuleToUserAccessRule(
		blockRule: BlockRule,
	): UserAccessRule {
		const userAccessRule: UserAccessRule = {
			isUserBlocked: blockRule.hardBlock,
			clientId: blockRule.dappAccount,
		};

		if (undefined !== blockRule.captchaConfig) {
			userAccessRule.config = {
				imageCaptcha: {
					solvedCount: blockRule.captchaConfig.solved.count,
					unsolvedCount: blockRule.captchaConfig.unsolved.count,
				},
			};
		}

		return userAccessRule;
	}
}

export { MigrateBlockRuleDbRecordsToUserAccessPolicyCommand };
