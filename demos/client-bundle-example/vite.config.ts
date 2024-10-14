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

import { loadEnv } from "@prosopo/dotenv";
import { type UserConfig, defineConfig } from "vite";

export default defineConfig(({ command, mode }) => {
	loadEnv();
	return {
		watch: false,
		mode: "development",
		server: {
			host: true,
			cors: true,
		},
		define: {
			"import.meta.env.PROSOPO_SITE_KEY": JSON.stringify(
				process.env.PROSOPO_SITE_KEY,
			),
			"import.meta.env.PROSOPO_SERVER_URL": JSON.stringify(
				process.env.PROSOPO_SERVER_URL,
			),
		},
	} as UserConfig;
});
