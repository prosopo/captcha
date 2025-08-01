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

import fs from "node:fs";
import { at } from "@prosopo/util";
import fg from "fast-glob";
import type { Argv } from "yargs";
import { z } from "zod";

export const buildLicenseCommand = () => {
	return {
		command: "license",
		describe: "Check the license in the workspace",
		builder: (yargs: Argv) => {
			return yargs
				.option("pkg", {
					alias: "p",
				})
				.option("fix", {
					alias: "f",
					type: "boolean",
					default: false,
				})
				.option("ignore", {
					alias: "i",
					type: "array",
					string: true,
					default: [],
				})
				.option("list", {
					alias: "l",
					type: "boolean",
					default: false,
				});
		},
		handler: async (argv: unknown) => {
			const args = z
				.object({
					pkg: z.string(),
					fix: z.boolean(),
					ignore: z.array(z.string()),
					list: z.boolean(),
				})
				.parse(argv);
			await license(args);
		},
	};
};

const license = async (args: {
	pkg: string;
	fix: boolean;
	ignore: string[];
	list: boolean;
}) => {
	const header = `// Copyright 2021-${new Date().getFullYear()} Prosopo (UK) Ltd.
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
// limitations under the License.`;

	const searchPaths = [
		"**/*.ts",
		"**/*.tsx",
		"**/*.rs",
		"**/*.js",
		"**/*.jsx",
		"**/*.cjs",
		"**/*.mjs",
		"**/*.cts",
		"**/*.mts",
	];

	const currentPath = args.pkg;
	const ignore = args.ignore;

	const files = fg
		.sync(searchPaths, {
			cwd: currentPath,
			absolute: true,
			ignore: [
				...ignore,
				"**/node_modules/**",
				"**/cargo-cache/**",
				"**/dist/**",
				"**/target/**",
				"**/coverage/**",
				"**/vite.cjs.config.ts.timestamp*",
				"**/js_bundles_host_temp/**",
				"**/client-bundle-example/src/assets/**",
				"**/next-env.d.ts/**",
				"**/packages/docs/**",
				"**/cloudflareBundle.js",
				// polkadot files
				"**/packages/util-crypto/**",
				"**/packages/keyring/src/keyring/**",
				"**/packages/keyring/src/pair/**",
				"**/packages/types/src/keyring/keyring/**",
				"**/packages/types/src/keyring/pair/**",
			],
		})
		.filter((file) => fs.lstatSync(file).isFile());

	if (args.list) {
		console.log(JSON.stringify(files, null, 4));
		console.log("Found", files.length, "files");
	} else if (!args.fix) {
		for (const file of files) {
			const fileContents = fs.readFileSync(file, "utf8");
			if (fileContents.includes(header)) {
				console.log("License present:", file);
			} else {
				throw new Error(`License not present: ${file}`);
			}
		}
	} else if (args.fix) {
		//for each file, check if file contains // Copyright (C) Prosopo (UK) Ltd.
		for (const file of files) {
			//check if file is a file, not a directory
			const fileContents = fs.readFileSync(file, "utf8");
			const lines = fileContents.split("\n");
			if (fileContents.indexOf("// Copyright") > -1) {
				// get the line on which the license begins
				let startingLine = 0;
				while (!at(lines, startingLine).startsWith("//")) {
					startingLine++;
				}

				//remove the old license and replace with the new one
				// find the line containing `// along with Prosopo Procaptcha.  If not, see <http://www.gnu.org/licenses/>.` and take the lines array from there
				let count = startingLine;
				let line = at(lines, count);
				let lineStartsWithSlashes = line.startsWith("//");
				while (lineStartsWithSlashes) {
					lineStartsWithSlashes = line.startsWith("//");
					if (lineStartsWithSlashes) {
						line = at(lines, ++count);
					}
				}
				if (!line.startsWith("//")) {
					count = count - 1;
					line = at(lines, count);
				}
				if (
					line.endsWith("If not, see <http://www.gnu.org/licenses/>.") ||
					line.endsWith("// limitations under the License.")
				) {
					let newFileContents = "";
					if (startingLine > 0) {
						newFileContents = `${lines.slice(0, startingLine).join("\n")}\n${header}\n${lines
							.slice(count + 1)
							.join("\n")}`;
					} else {
						newFileContents = `${header}\n${lines.slice(count + 1).join("\n")}`;
					}

					if (newFileContents !== fileContents) {
						//console.log(newFileContents)
						fs.writeFileSync(file, newFileContents);
						console.log("File Updated:", file);
					}
				}
			} else {
				// if it doesn't, add it
				const newFileContents = `${header}\n${fileContents}`;
				//console.log(newFileContents)
				fs.writeFileSync(file, newFileContents);
				console.log("File Updated:", file);
			}
		}
	}
};
