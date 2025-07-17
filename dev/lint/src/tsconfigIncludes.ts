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

export const tsconfigIncludes = async () => {
	// Parse arguments using yargs
	const argv = await yargs(hideBin(process.argv))
		.option("pkg", {
			alias: "p",
			type: "string",
			describe: "Path to the root package.json",
			demandOption: true,
		})
		.option("fix", {
			alias: "f",
			type: "boolean",
			describe: "Automatically fix missing includes in tsconfig files",
			default: false,
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

	// Helper function to check and optionally fix includes
	function checkAndFixInclude({
		includes,
		pattern,
		errorMsg,
		tsconfigPath,
	}: {
		includes: string[];
		pattern: string;
		errorMsg: string;
		tsconfigPath: string;
	}) {
		if (!includes.includes(pattern)) {
			if (args.fix) {
				includes.push(pattern);
				console.log(`Added "${pattern}" to ${tsconfigPath} \"includes\"`);
			} else {
				throw new Error(`${tsconfigPath} ${errorMsg}`);
			}
		}
	}

	// for each package in the workspace
	const globs = z
		.string()
		.array()
		.parse(pkgJson.workspaces)
		.map((g) => `${path.dirname(args.pkg)}/${g}/tsconfig{,.+}.json`);
	const tsconfigPaths = fg.globSync(globs);
	for (const tsconfigPath of tsconfigPaths) {
		console.log("Checking", tsconfigPath);
		const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf8"));
		const includesResult = z.array(z.string()).safeParse(tsconfig.include);
		let includes: string[] = [];
		if (!includesResult.success) {
			if (!args.fix) {
				throw new Error(`${tsconfigPath} has no/invalid include property`);
			}
		} else {
			includes = includesResult.data;
		}
		// ensure "includes" includes ts, tsx, json and d.ts files (note that json and d.ts are not included by default in tsc, this is why we need to explicitly include them)
		checkAndFixInclude({
			includes,
			pattern: "src/**/*.ts",
			errorMsg: "does not include ts files",
			tsconfigPath,
		});
		checkAndFixInclude({
			includes,
			pattern: "src/**/*.tsx",
			errorMsg: "does not include tsx files",
			tsconfigPath,
		});
		checkAndFixInclude({
			includes,
			pattern: "src/**/*.json",
			errorMsg: "does not include json files",
			tsconfigPath,
		});
		checkAndFixInclude({
			includes,
			pattern: "src/**/*.d.ts",
			errorMsg: "does not include d.ts files",
			tsconfigPath,
		});
		if (args.fix) {
			tsconfig.include = includes;
			fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 4));
			console.log(`Fixed ${tsconfigPath} "includes"`);
		}
	}
};
