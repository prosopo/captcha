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
import type { Plugin } from "vite";

/**
 * Empties the generated `exports2.FILES` array in every emitted chunk so that
 * bundled file listings are not leaked into the output.
 */
export default function modifyExportsFilesPlugin(): Plugin {
	return {
		name: "modify-exports-files",
		generateBundle(_options, bundle) {
			for (const fileName in bundle) {
				const chunk = bundle[fileName];
				if (chunk && chunk.type === "chunk") {
					chunk.code = chunk.code.replace(
						/exports2\.FILES = \[[\s\S]*?\];/g,
						"exports2.FILES = [];\n",
					);
				}
			}
		},
	};
}
