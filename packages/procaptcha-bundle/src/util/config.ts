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
import {
	EnvironmentTypesSchema,
	type ProcaptchaClientConfigOutput,
	ProcaptchaConfigSchema,
} from "@prosopo/types";

export const getConfig = (siteKey?: string): ProcaptchaClientConfigOutput => {
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
	});
};

export const getProcaptchaScript = (name: string) =>
	document.querySelector<HTMLScriptElement>(`script[src*="${name}"]`);

export const extractParams = (name: string) => {
	const script = getProcaptchaScript(name);
	if (script && script.src.indexOf(`${name}`) !== -1) {
		const params = new URLSearchParams(script.src.split("?")[1]);
		return {
			onloadUrlCallback: params.get("onload") || undefined,
			renderExplicit: params.get("render") || undefined,
		};
	}

	return { onloadUrlCallback: undefined, renderExplicit: undefined };
};
