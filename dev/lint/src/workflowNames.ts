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

export const buildWorkflowNamesCommand = () => {
	return {
		command: "workflowNames",
		describe: "Check the workflow names in the workspace",
		builder: (yargs: Argv) => {
			return yargs.option("root", {
				alias: "r",
			});
		},
		handler: async (argv: unknown) => {
			const args = z
				.object({
					root: z.string(),
				})
				.parse(argv);
			await workflowNames({ root: args.root });
		},
	};
};

const workflowNames = async (args: {
	root: string;
}) => {
	const workflowsDir = path.join(args.root, ".github/workflows");
	console.log("Scanning for workflows in", args.root);

	// find all workflow files
	const pths = fg.globSync([`${workflowsDir}/*.yml`, `${workflowsDir}/*.yaml`]);
	for (const pth of pths) {
		console.log(`Checking ${pth}`);
		const workflow = fs.readFileSync(pth, "utf8");
		// find the first line with '- name: ' and extract the name
		const names = workflow.match(/name: (.*)/);
		if (!names || names[1] === undefined) {
			throw new Error(`No name found in workflow file: ${pth}`);
		}
		const target = path.basename(pth, ".yml").trim();
		// name should match the filename
		const name = names[1].trim();
		if (name !== target) {
			for (let i = 0; i < name.length; i++) {
				console.log(`${name.charCodeAt(i)}`);
			}
			throw new Error(`${pth} has name ${name}, should be ${target}`);
		}
	}
	console.log("Workflow names check complete");
};
