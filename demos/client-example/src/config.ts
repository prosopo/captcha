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

import { getServerUrl } from "@prosopo/server";
import {
	CaptchaType,
	ProcaptchaConfigSchema,
	type ProsopoClientConfigOutput,
} from "@prosopo/types";

export const configBase = {
	web2: process.env.PROSOPO_WEB2 !== "false",
	defaultEnvironment: process.env.PROSOPO_DEFAULT_ENVIRONMENT,
	dappName: "client-example",
	serverUrl: getServerUrl(),
	theme: "light",
};

const configs = {
	[CaptchaType.image]: ProcaptchaConfigSchema.parse({
		...configBase,

		account: {
			address:
				process.env.PROSOPO_SITE_KEY_IMAGE || process.env.PROSOPO_SITE_KEY,
		},
	}),
	[CaptchaType.pow]: ProcaptchaConfigSchema.parse({
		...configBase,

		account: {
			address: process.env.PROSOPO_SITE_KEY_POW || process.env.PROSOPO_SITE_KEY,
		},
	}),
	[CaptchaType.frictionless]: ProcaptchaConfigSchema.parse({
		...configBase,

		account: {
			address:
				process.env.PROSOPO_SITE_KEY_FRICTIONLESS ||
				process.env.PROSOPO_SITE_KEY,
		},
	}),
};

export default configs;
