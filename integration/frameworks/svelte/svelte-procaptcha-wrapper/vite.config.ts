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

import { createIntegrationViteConfig } from "@prosopo/procaptcha-integration-build-config";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default createIntegrationViteConfig({
	name: "SvelteProcaptchaWrapper",
	directory: __dirname,
	viteSettings: {
		plugins: [svelte()],
		build: {
			rollupOptions: {
				external: ["svelte", "svelte/*"],
				output: {
					globals: {
						svelte: "Svelte",
						"svelte/*": "Svelte",
					},
				},
			},
		},
	},
});
