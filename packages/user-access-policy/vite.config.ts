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

import * as path from "node:path";
import { ViteCommonJSConfig } from "@prosopo/config";
import { defineConfig } from "vite";

// Vite is used for building instead of the vanilla 'tsc --build' command as
// we need to turn the TypeScript aliases (#policy) into relative file paths,
// so it can be used by bundling script from the cli package.
export default async () => {
	const viteConfig = await ViteCommonJSConfig(
		"user-access-policy",
		path.resolve("./tsconfig.json"),
	);

	return defineConfig({
		...viteConfig,
		build: {
			...viteConfig.build,
			outDir: "dist",
			lib: {
				...viteConfig.build?.lib,
				formats: ["es"],
			},
		},
	});
};
