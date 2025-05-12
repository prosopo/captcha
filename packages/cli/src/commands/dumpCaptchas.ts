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
import type { KeyringPair } from "@polkadot/keyring/types";
import { LogLevel, type Logger, getLogger } from "@prosopo/common";
import { ProviderEnvironment } from "@prosopo/env";
import { Tasks } from "@prosopo/provider";
import type { ProsopoConfigOutput } from "@prosopo/types";
import type { ArgumentsCamelCase, Argv } from "yargs";
import * as z from "zod";

export default (
	pair: KeyringPair,
	config: ProsopoConfigOutput,
	cmdArgs?: { logger?: Logger },
) => {
	const logger =
		cmdArgs?.logger || getLogger(LogLevel.enum.info, "cli.dump_captcha");

	return {
		command: "dump_captcha",
		describe: "Dump a captcha an optional solution to a directory",
		builder: (yargs: Argv) =>
			yargs
				.option("dir", {
					type: "string" as const,
					demandOption: true,
					desc: "The directory to dump the captcha to",
				} as const)
				.option("commitmentId", {
					type: "string" as const,
					demandOption: true,
					desc: "The commitment ID of the captcha to dump",
				} as const),
		handler: async (argv: ArgumentsCamelCase) => {
			try {
				const env = new ProviderEnvironment(config, pair);
				await env.isReady();

				const tasks = new Tasks(env);

				const dir = z.string().parse(argv.dir);
				const commitmentId = z.string().parse(argv.commitmentId);
				const userSolutions =
					await tasks.db.getDappUserSolutionById(commitmentId);
				if (!userSolutions || userSolutions.length === 0) {
					logger.error("No solutions found for this commitment ID");
					return;
				}
				const captchaIds = userSolutions.map((captcha) => captcha.captchaId);
				const captchas = await tasks.db.getCaptchaById(captchaIds);

				if (!captchas || captchas.length === 0) {
					logger.error("No captchas found for this commitment ID");
					return;
				}

				const solutions = await tasks.db.getSolutionsByCaptchaIds(captchaIds);

				if (!solutions || solutions.length === 0) {
					logger.error("No solutions found for this commitment ID");
					return;
				}

				// add the solutions to the captchas object
				const captchasWithSolutions = captchas.map((captcha) => {
					const userSolution = userSolutions.find(
						(s) => s.captchaId === captcha.captchaId,
					);
					return {
						...captcha,
						usersolution: userSolution ? userSolution.solution : null,
						solution: solutions.find((s) => s.captchaId === captcha.captchaId)
							?.solution,
					};
				});

				const directory = path.resolve(dir);
				const commitmentDir = path.resolve(directory, commitmentId);

				// create a for the commitmentId if it doesn't exist
				if (!fs.existsSync(commitmentDir)) {
					fs.mkdirSync(commitmentDir);
				}

				// dump the captchasWithSolutions to the directory as a JSON file
				const filePath = path.join(commitmentDir, `${commitmentId}.json`);
				console.log("writing to", filePath);
				fs.writeFileSync(
					filePath,
					JSON.stringify(captchasWithSolutions, null, 2),
				);

				// for each captcha in captchaWithSolutions, get the image and save it to the directory
				for (const captcha of captchasWithSolutions) {
					// make a directory with captchaId
					const captchaDirectory = path.join(
						commitmentDir,
						`${captcha.captchaId}`,
					);
					if (!fs.existsSync(captchaDirectory)) {
						fs.mkdirSync(captchaDirectory);
					}

					for (const item of captcha.items) {
						if (item.type === "image") {
							const imageUrl = item.data;
							const imageHash = item.hash;

							const imageResponse = await fetch(imageUrl);
							const imageBuffer = Buffer.from(
								await imageResponse.arrayBuffer(),
							);
							// if the item hash was in the user's solutions prefix the filename with solution. Otherwise no prefix
							const userSolution = userSolutions.find(
								(s) =>
									s.captchaId === captcha.captchaId &&
									s.solution.includes(imageHash),
							)
								? "_USER_SOLUTION"
								: "";

							// check if the image is in captcha.solution
							const solution = solutions.find(
								(s) =>
									s.captchaId === captcha.captchaId &&
									s.solution.includes(imageHash),
							)
								? "_SOLUTION"
								: "";

							const imageFilePath = path.join(
								captchaDirectory,
								`${imageHash}${solution}${userSolution}.jpg`,
							);

							console.log("writing to", imageFilePath);
							fs.writeFileSync(imageFilePath, imageBuffer);
						}
					}
				}
			} catch (err) {
				logger.error(err);
			}
		},
		middlewares: [],
	};
};
