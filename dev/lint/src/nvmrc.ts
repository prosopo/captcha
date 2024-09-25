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
	root: string;
}) => {
	console.log("Scanning", args.root);

	let target = "";
	// find all .nvmrc files
	const pths = fg.globSync([`${args.root}/**/.nvmrc`], {
		ignore: ["**/node_modules/**", "**/.git/**"],
	});
	for (const pth of pths) {
		const nvmrc = fs.readFileSync(pth, "utf8");
		if (!nvmrc) {
			throw new Error(`Empty nvmrc file: ${pth}`);
		}
		console.log(`${pth}: ${nvmrc}`);
		if (!target) {
			// first nvmrc file discovered
			// set the target version
			target = nvmrc;
		} else {
			// subsequent nvmrc files
			// check they match the target version
			if (nvmrc !== target) {
				throw new Error(`Mismatched nvmrc file: ${pth}`);
			}
		}
	}
};

main({
	root: z.string().parse(process.argv[2]),
}).catch((err) => {
	console.error(err);
	process.exit(1);
});
