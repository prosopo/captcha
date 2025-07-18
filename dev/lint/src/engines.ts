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
import type { Argv } from "yargs";
import z from "zod";

export const buildEnginesCommand = () => {
	return {
		command: "engines",
		describe: "Check the engines of the workspace",
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

			await engines({ pkg: args.pkg });
		},
	};
};

const engines = async (args: {
	pkg: string;
}) => {
	console.log("Checking", args.pkg);
	// read the pkg json file
	const pkgJson = JSON.parse(fs.readFileSync(args.pkg, "utf8"));
	// only accept workspace pkg json
	if (pkgJson.workspaces === undefined) {
		throw new Error(`${args.pkg} is not a workspace`);
	}

	const enginesSchema = z.object({
		node: z.string(),
		npm: z.string(),
	});
	const engines = enginesSchema.parse(pkgJson.engines);

	// for each package in the workspace, check their version matches the workspace version
	const globs = z
		.string()
		.array()
		.parse(pkgJson.workspaces)
		.map((g) => `${path.dirname(args.pkg)}/${g}/package.json`);
	const pkgJsonPaths = fg.globSync(globs);
	for (const pkgJsonPath of pkgJsonPaths) {
		console.log("Checking", pkgJsonPath);
		const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
		const pkgEngineResult = enginesSchema.safeParse(pkgJson.engines);
		if (!pkgEngineResult.success) {
			throw new Error(
				`${pkgJsonPath} has invalid engines: ${pkgEngineResult.error.message}`,
			);
		}
		const pkgEngine = pkgEngineResult.data;
		if (pkgEngine.node !== engines.node) {
			throw new Error(
				`${pkgJsonPath} has node version ${pkgEngine.node}, should be ${engines.node}`,
			);
		}
		if (pkgEngine.npm !== engines.npm) {
			throw new Error(
				`${pkgJsonPath} has npm version ${pkgEngine.npm}, should be ${engines.npm}`,
			);
		}
	}
	console.log("Engines check complete");
};
