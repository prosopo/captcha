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

import type { Languages } from "@prosopo/locale";
import {
	EnvironmentTypesSchema,
	type ProcaptchaClientConfigOutput,
	ProcaptchaConfigSchema,
} from "@prosopo/types";

function createConfig(
	siteKey?: string,
	theme: "light" | "dark" = "light",
	language?: (typeof Languages)[number],
	web2 = true,
	invisible = false,
): ProcaptchaClientConfigOutput {
	if (!siteKey) {
		siteKey = process.env.PROSOPO_SITE_KEY || "";
	}

	return ProcaptchaConfigSchema.parse({
		defaultEnvironment: process.env.PROSOPO_DEFAULT_ENVIRONMENT
			? EnvironmentTypesSchema.parse(process.env.PROSOPO_DEFAULT_ENVIRONMENT)
			: EnvironmentTypesSchema.enum.development,
		userAccountAddress: "",
		account: {
			address: siteKey,
		},
		serverUrl: process.env.PROSOPO_SERVER_URL || "",
		mongoAtlasUri: process.env.PROSOPO_MONGO_EVENTS_URI || "",
		devOnlyWatchEvents: process.env._DEV_ONLY_WATCH_EVENTS === "true" || false,
		web2,
		mode: invisible ? "invisible" : "visible",
		theme,
		language,
	});
}

export { createConfig };
