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

import fs from "node:fs";
import path from "node:path";
import { env } from "node:process";
import { at, get } from "@prosopo/util";
import fg from "fast-glob";
import z from "zod";

const main = async (args: {
	pkgJsonPath: string;
}) => {
	console.log("Checking", args.pkgJsonPath);
	// read the pkg json file
	const pkgJson = JSON.parse(fs.readFileSync(args.pkgJsonPath, "utf8"));
	// only accept workspace pkg json
	if (pkgJson.workspaces === undefined) {
		throw new Error(`${args.pkgJsonPath} is not a workspace`);
	}

	const version = z.string().parse(pkgJson.version);

	// for each package in the workspace, check their version matches the workspace version
	const globs = z
		.string()
		.array()
		.parse(pkgJson.workspaces)
		.map((g) => `${path.dirname(args.pkgJsonPath)}/${g}/package.json`);
	const pkgJsonPaths = fg.globSync(globs);
	for (const pkgJsonPath of pkgJsonPaths) {
		console.log("Checking", pkgJsonPath);
		const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
		const pkgVersion = z.string().parse(pkgJson.version);
		if (pkgVersion !== version) {
			throw new Error(
				`${pkgJsonPath} is on version ${pkgVersion}, should be ${version}`,
			);
		}
	}

	// glob for any env files
	const envPaths = fg.globSync(
		["**/.env", "**/*.env", "**/env.*", "**/env"].map(
			(g) => `${path.dirname(args.pkgJsonPath)}/${g}`,
		),
		{
			onlyFiles: true,
			ignore: ["**/node_modules/**", "**/.git/**", "**.d.ts", "**.ts", "**.js"],
		},
	);
	for (const envPath of envPaths) {
		console.log("Checking", envPath);
		const env = fs.readFileSync(envPath, "utf8");
		// grep for the line PROSOPO_PACKAGE_VERSION=x.y.z
		const match = env.match(/PROSOPO_PACKAGE_VERSION=(.*)/);
		if (match !== null) {
			const envVersion = z.string().parse(match[1]);
			if (envVersion !== version) {
				throw new Error(
					`Version mismatch: ${envPath} has version ${envVersion} but workspace version is ${version}`,
				);
			}
		}
	}
};

main({
	pkgJsonPath: z.string().parse(process.argv[2]),
}).catch((err) => {
	console.error(err);
	process.exit(1);
});
