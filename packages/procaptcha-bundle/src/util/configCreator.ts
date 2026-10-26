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

import type { Languages } from "@prosopo/locale";
import {
	EnvironmentTypesSchema,
	type PlacementType,
	type ProcaptchaClientConfigOutput,
	ProcaptchaConfigSchema,
	resolvePlacement,
} from "@prosopo/types";

interface CreateConfigOptions {
	siteKey?: string;
	theme?: "light" | "dark";
	language?: (typeof Languages)[keyof typeof Languages];
	web2?: boolean;
	invisible?: boolean;
	placement?: PlacementType;
	userAccountAddress?: string;
	ipv4?: boolean;
	ipv6?: boolean;
}

function createConfig(
	options: CreateConfigOptions = {},
): ProcaptchaClientConfigOutput {
	const {
		theme = "light",
		language,
		web2 = true,
		invisible = false,
		placement,
		userAccountAddress,
		ipv4 = false,
		ipv6 = false,
	} = options;

	const siteKey = options.siteKey || process.env.PROSOPO_SITE_KEY || "";

	return ProcaptchaConfigSchema.parse({
		defaultEnvironment: process.env.PROSOPO_DEFAULT_ENVIRONMENT
			? EnvironmentTypesSchema.parse(process.env.PROSOPO_DEFAULT_ENVIRONMENT)
			: EnvironmentTypesSchema.enum.development,
		userAccountAddress: userAccountAddress || "",
		account: {
			address: siteKey,
		},
		serverUrl: process.env.PROSOPO_SERVER_URL || "",
		mongoAtlasUri: process.env.PROSOPO_MONGO_EVENTS_URI || "",
		web2,
		mode: invisible ? "invisible" : "visible",
		placement: resolvePlacement(placement, invisible),
		theme,
		language,
		ipv4,
		ipv6,
	});
}

export { createConfig };
export type { CreateConfigOptions };
