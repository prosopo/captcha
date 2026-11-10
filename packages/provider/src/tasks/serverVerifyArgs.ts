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

import type { IUserSettings } from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { AccessRulesStorage } from "@prosopo/user-access-policy";

export type ServerVerifySiteSettings = Pick<
	IUserSettings,
	| "verifiedTimeout"
	| "spamEmailDomainCheckEnabled"
	| "spamFilter"
	| "trafficFilter"
	| "storeMetadata"
	| "ipValidationRules"
>;

export type ServerVerifyCaptchaSolutionArgs = {
	dappAccount: string;
	challenge: string;
	env: ProviderEnvironment;
	settings: ServerVerifySiteSettings;
	/** The end user's IP as reported by the site's server. */
	ip?: string;
	/** The end user's email, when the site's server supplied one. */
	email?: string;
	/** The session id the site rendered the widget with; the solve must carry the same one. */
	clientSessionId?: string;
	userAccessRulesStorage?: AccessRulesStorage;
};
