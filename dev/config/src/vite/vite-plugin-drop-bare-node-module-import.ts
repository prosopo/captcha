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
import type { Plugin, Rollup } from "vite";

const BARE_NODE_MODULE_IMPORT = /^import\s*["']node:module["'];?[^\S\n]*\n?/gm;

/**
 * Removes `import "node:module";` statements that import nothing.
 *
 * Rolldown's runtime chunk imports `createRequire` from `node:module`. Vite later
 * drops the unused helpers but keeps the import, now without a binding, and
 * library builds run with tree-shaking off, so every entry ends up importing
 * `node:module` and browser bundlers fail to resolve it. `node:module` has no
 * side effects, so a bindingless import of it is dead code. This runs in
 * `generateBundle` because the import only becomes bindingless after
 * `renderChunk`.
 */
export default function VitePluginDropBareNodeModuleImport(): Plugin {
	return {
		name: "drop-bare-node-module-import",
		generateBundle(_options: unknown, bundle: Rollup.OutputBundle) {
			for (const output of Object.values(bundle)) {
				if (output.type === "chunk") {
					output.code = output.code.replace(BARE_NODE_MODULE_IMPORT, "");
				}
			}
		},
	};
}
