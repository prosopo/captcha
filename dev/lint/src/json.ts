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
import path from "node:path";
import { env } from "node:process";
import { at, get } from "@prosopo/util";
import fg from "fast-glob";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import z from "zod";

export const json = async () => {
	// Parse arguments using yargs
	const argv = await yargs(hideBin(process.argv))
		.option("pkg", {
			alias: "p",
			type: "string",
			describe: "Path to the root package.json",
			demandOption: true,
		})
		.help().argv;
	const args = z
		.object({
			pkg: z.string(),
			fix: z.boolean().default(false),
		})
		.parse(argv);

	console.log("Checking", args.pkg);
	// read the pkg json file
	const pkgJson = JSON.parse(fs.readFileSync(args.pkg, "utf8"));
	// only accept workspace pkg json
	if (pkgJson.workspaces === undefined) {
		throw new Error(`${args.pkg} is not a workspace`);
	}

	// for each package in the workspace
	const globs = z
		.string()
		.array()
		.parse(pkgJson.workspaces)
		.map((g) => `${path.dirname(args.pkg)}/${g}/**/*.json`);
	// glob the json files
	const jsonPaths = fg.globSync(globs);
	for (const jsonPath of jsonPaths) {
		console.log("Checking", jsonPath);
		const content = fs.readFileSync(jsonPath, "utf8")
		try {
			// check if the json is valid
			const json = JSON.parse(content);
			console.log(`${jsonPath} is valid JSON`);
		} catch (e) {
			throw new Error(`Unable to parse ${jsonPath} as JSON: ${e}`);
		}
	}
};
