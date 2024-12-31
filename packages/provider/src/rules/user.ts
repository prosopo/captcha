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

import type { BlockRule } from "@prosopo/types";
import type { IProviderDatabase } from "@prosopo/types-database";

// fixme _remove
export const checkUserRules = async (
	db: IProviderDatabase,
	user: string,
	dapp: string,
): Promise<BlockRule | undefined> => {
	const userRule = await db.getUserBlockRuleRecord(user, dapp);

	if (
		userRule &&
		userRule.userAccount === user &&
		userRule.dappAccount === dapp
	) {
		return userRule;
	}
	return undefined;
};
