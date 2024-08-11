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

// biome-ignore lint/style/useNodejsImportProtocol: TODO Breaks bundling otherwise, should this be pulled into own pkg?
import { fileURLToPath } from "url";

// https://stackoverflow.com/a/76582917
/**
 * Determines whether a module is the entry point for the running node process.
 * This works for both CommonJS and ES6 environments.
 *
 * ### CommonJS
 * ```js
 * if (moduleIsEntry(module)) {
 *     console.log('WOO HOO!!!');
 * }
 * ```
 *
 * ### ES6
 * ```js
 * if (moduleIsEntry(import.meta.url)) {
 *     console.log('WOO HOO!!!');
 * }
 * ```
 */
export const isMain = (
	moduleOrImportMetaUrl: NodeModule | string,
	binName?: string,
) => {
	if (typeof moduleOrImportMetaUrl === "string") {
		return (
			process.argv[1] === fileURLToPath(moduleOrImportMetaUrl) ||
			// could be running with npx
			(binName &&
				process.argv[1] &&
				process.argv[1].indexOf(`node_modules/.bin/${binName}`) > -1)
		);
	}

	if (typeof require !== "undefined" && "exports" in moduleOrImportMetaUrl) {
		return require.main === moduleOrImportMetaUrl;
	}

	return false;
};
