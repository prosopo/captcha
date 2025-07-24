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
import yargs, { type Argv } from "yargs";
import { hideBin } from "yargs/helpers";
import z from "zod";

export const buildTestCheckCommand = () => {
	return {
		command: "testCheck",
		describe: "Check packages that have tests have an npm script to run them",
		builder: (yargs: Argv) => {
			return yargs.option("pkg", {
				alias: "p",
			});
		},
		handler: async (argv: unknown) => {
			const args = z
				.object({
					pkg: z.string(),
				})
				.parse(argv);
			await testCheck(args);
		},
	};
};

const testCheck = (args: {
	pkg: string;
}) => {
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
		.map((g) => `${path.dirname(args.pkg)}/${g}/package.json`);
	const pkgJsonPaths = fg.globSync(globs);
	for (const pkgJsonPath of pkgJsonPaths) {
		console.log("Checking", pkgJsonPath);
		const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
		const hasTestScript = pkgJson.scripts?.test !== undefined;
		// glob for test files in the source dir (.test.ts or .spec.ts)
		const testFiles = fg.globSync([
			`${path.dirname(pkgJsonPath)}/src/**/*.test.ts`,
			`${path.dirname(pkgJsonPath)}/src/**/*.spec.ts`,
			`${path.dirname(pkgJsonPath)}/src/**/*.test.tsx`,
			`${path.dirname(pkgJsonPath)}/src/**/*.spec.tsx`,
		]);
		if (hasTestScript) {
			// package has a test script
			if (testFiles.length === 0) {
				// but has no test files
				throw new Error(`${pkgJsonPath} has a test script but no test files!`);
			} // else has test files - fine
		} else {
			// package has no test script
			if (testFiles.length > 0) {
				// but has test files
				throw new Error(`${pkgJsonPath} has test files but no test script!`);
			} // else has no test files - fine
		}
	}
	console.log("Test check complete");
};
