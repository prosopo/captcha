// Copyright 2021-2026 Prosopo (UK) Ltd.
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

import { IPValidationRulesSchema, type IUserSettings } from "@prosopo/types";
import type { VerifyOptions } from "./mint.js";

export type Scenario = {
	name: string;
	description: string;
	settings: Partial<IUserSettings>;
	verify: VerifyOptions;
	expectVerified: boolean;
	// Spend each token once before the measured call, so the measured call is a replay.
	replay?: boolean;
	waitBeforeVerifyMs?: number;
};

export const SCENARIOS: Scenario[] = [
	{
		name: "pass",
		description: "valid token, no ip or email from the site",
		settings: {},
		verify: {},
		expectVerified: true,
	},
	{
		name: "pass-ip",
		description: "valid token, site passes the end user's ip",
		settings: {},
		verify: { sendIp: true },
		expectVerified: true,
	},
	{
		name: "pass-ip-validation",
		description: "valid token, ip passed and the site has ip validation on",
		settings: {
			ipValidationRules: IPValidationRulesSchema.parse({
				enabled: true,
				actions: {},
			}),
		},
		verify: { sendIp: true },
		expectVerified: true,
	},
	{
		name: "replay",
		description: "token already verified once",
		settings: {},
		verify: { sendIp: true },
		expectVerified: false,
		replay: true,
	},
	{
		name: "expired",
		description: "verify arrives after the site's verifiedTimeout",
		settings: { verifiedTimeout: 1000 },
		verify: { sendIp: true },
		expectVerified: false,
		waitBeforeVerifyMs: 1100,
	},
];
