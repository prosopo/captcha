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

import { apiRulePaths } from "./apiRulePaths.js";

const getExpressApiRuleRateLimits = () => {
	const defaultWindowsMs = 60000;
	const defaultLimit = 5;

	return {
		[apiRulePaths.INSERT_MANY]: {
			windowMs:
				process.env.PROSOPO_USER_ACCESS_POLICY_RULE_INSERT_MANY_WINDOW ||
				defaultWindowsMs,
			limit:
				process.env.PROSOPO_USER_ACCESS_POLICY_RULE_INSERT_MANY_LIMIT ||
				defaultLimit,
		},
		[apiRulePaths.DELETE_MANY]: {
			windowMs:
				process.env.PROSOPO_USER_ACCESS_POLICY_RULE_DELETE_MANY_WINDOW ||
				defaultWindowsMs,
			limit:
				process.env.PROSOPO_USER_ACCESS_POLICY_RULE_DELETE_MANY_LIMIT ||
				defaultLimit,
		},
	};
};

export { getExpressApiRuleRateLimits };
