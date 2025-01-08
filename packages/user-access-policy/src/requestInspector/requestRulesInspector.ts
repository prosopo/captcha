import type { IPAddress } from "@prosopo/types";
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
import type { RulesStorage } from "../rule/storage/rulesStorage.js";
import type { RequestInspector } from "./requestInspector.js";

class RequestRulesInspector implements RequestInspector {
	public constructor(private readonly rulesStorage: RulesStorage) {}

	public async shouldAbortRequest(
		ipAddress: IPAddress,
		requestHeaders: Record<string, unknown>,
		requestBody: Record<string, unknown>,
	): Promise<boolean> {
		return await this.isRequestFromBlockedUser(
			ipAddress,
			requestHeaders,
			requestBody,
		);
	}

	protected async isRequestFromBlockedUser(
		ipAddress: IPAddress,
		requestHeaders: Record<string, unknown>,
		requestBody: Record<string, unknown>,
	): Promise<boolean> {
		const { userId, clientId } = this.extractIdsFromRequest(
			requestHeaders,
			requestBody,
		);

		return await this.isUserBlocked(clientId, ipAddress, userId);
	}

	protected extractIdsFromRequest(
		requestHeaders: Record<string, unknown>,
		requestBody: Record<string, unknown>,
	): {
		userId: string;
		clientId: string;
	} {
		const userId =
			this.getObjectValue(requestHeaders, "Prosopo-User") ||
			this.getObjectValue(requestBody, "user") ||
			"";
		const clientId =
			this.getObjectValue(requestHeaders, "Prosopo-Site-Key") ||
			this.getObjectValue(requestBody, "dapp") ||
			"";

		return {
			userId: "string" === typeof userId ? userId : "",
			clientId: "string" === typeof clientId ? clientId : "",
		};
	}

	protected getObjectValue(
		object: Record<string, unknown>,
		key: string,
	): unknown {
		return object[key];
	}

	protected async isUserBlocked(
		clientId: string,
		ipAddress: IPAddress,
		userId: string,
	): Promise<boolean> {
		const accessRules = await this.rulesStorage.find(
			{
				clientId: clientId,
				userIpAddress: ipAddress,
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

		return blockingRules.length > 0;
	}
}

export { RequestRulesInspector };
