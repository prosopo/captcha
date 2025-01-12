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

import type { BlockRule, IPAddress } from "@prosopo/types";
import type { IProviderDatabase } from "@prosopo/types-database";

export const checkIpRules = async (
	db: IProviderDatabase,
	ipAddress: IPAddress,
	dapp: string,
): Promise<BlockRule | undefined> => {
	const rule = await db.getIPBlockRuleRecord(ipAddress.bigInt());

	if (rule && BigInt(rule.ip) === ipAddress.bigInt()) {
		// block by IP address globally
		if (rule.global) {
			return rule;
		}

		if (rule.dappAccount === dapp) {
			return rule;
		}
	}

	const dappRule = await db.getIPBlockRuleRecord(ipAddress.bigInt(), dapp);
	if (
		dappRule &&
		dappRule.dappAccount === dapp &&
		BigInt(dappRule.ip) === ipAddress.bigInt()
	) {
		return rule;
	}

	return undefined;
};
