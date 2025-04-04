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
import type { IPAddress } from "@prosopo/types";
import type { BlacklistInspector } from "../blacklistInspector.js";
import type { RulesStorage } from "./storage/rulesStorage.js";

class BlacklistRulesInspector implements BlacklistInspector {
	public constructor(
		private readonly rulesStorage: RulesStorage,
		private readonly logger: Logger,
	) {}

	public async isUserBlacklisted(
		clientId: string,
		userIpAddress: IPAddress,
		ja4: string,
		userId: string,
	): Promise<boolean> {
		this.logger.debug({
			clientId: clientId,
			userIpAddress: userIpAddress,
			ja4: ja4,
			userId: userId,
		});
		const accessRules = await this.rulesStorage.find(
			{
				clientId: clientId,
				userIpAddress: userIpAddress,
				ja4: ja4,
				userId: userId,
			},
			{
				includeRecordsWithPartialFilterMatches: true,
				includeRecordsWithoutClientId: true,
			},
		);

		const blockingRules = accessRules.filter(
			(accessRule) => accessRule.isUserBlocked,
		);

		const userBlacklisted = blockingRules.length > 0;

		if (userBlacklisted) {
			this.logger.info({
				userBlacklisted: userBlacklisted,
				clientId: clientId,
				userIpAddress: userIpAddress.address.toString(),
				userId: userId,
				accessRules: accessRules.length,
				blockingRules: blockingRules.length,
			});
		}

		return userBlacklisted;
	}
}

export { BlacklistRulesInspector };
