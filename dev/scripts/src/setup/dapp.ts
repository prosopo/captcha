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

import type { ProviderEnvironment } from "@prosopo/env";
import { Tasks } from "@prosopo/provider";
import { CaptchaType, Tier } from "@prosopo/types";

export async function registerSiteKey(
	env: ProviderEnvironment,
	siteKey: string,
): Promise<void> {
	const logger = env.logger;
	const tasks = new Tasks(env);
	logger.info({}, "   - siteKeyRegister");
	await tasks.clientTaskManager.registerSiteKey(
		siteKey as string,
		Tier.Professional,
		{
			captchaType: CaptchaType.frictionless,
			frictionlessThreshold: 0.8,
			powDifficulty: 4,
			domains: ["localhost", "0.0.0.0"],
			imageThreshold: 0.8,
		},
	);
}
