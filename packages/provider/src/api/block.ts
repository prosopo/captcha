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

import { getLogger } from "@prosopo/common";
import type { ProviderEnvironment } from "@prosopo/types-env";
import { createAccessPolicyResolver } from "@prosopo/user-access-policy";
import { BlacklistRequestInspector } from "./blacklistRequestInspector.js";

export const blockMiddleware = (providerEnvironment: ProviderEnvironment) => {
	const logLevel = providerEnvironment.config.logLevel;
	const logger = getLogger(logLevel, "blockMiddleware");

	const userAccessRulesStorage = providerEnvironment
		.getDb()
		.getUserAccessRulesStorage();

	const environmentReadinessWaiter =
		providerEnvironment.isReady.bind(providerEnvironment);

	const resolveAccessPolicy = createAccessPolicyResolver(
		userAccessRulesStorage,
		logger,
	);

	const blacklistRequestInspector = new BlacklistRequestInspector(
		resolveAccessPolicy,
		environmentReadinessWaiter,
	);

	return blacklistRequestInspector.abortRequestForBlockedUsers.bind(
		blacklistRequestInspector,
	);
};
