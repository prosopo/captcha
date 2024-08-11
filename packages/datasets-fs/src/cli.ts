import { isMain } from "@prosopo/util";
import type { CliCommandAny } from "./cli/cliCommand.js";
import { Flatten } from "./commands/flatten.js";
import { GenerateV1 } from "./commands/generateV1.js";
import { GenerateV2 } from "./commands/generateV2.js";
import { Get } from "./commands/get.js";
import { Labels } from "./commands/labels.js";
import { Relocate } from "./commands/relocate.js";
import { Resize } from "./commands/resize.js";
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
import { Cli } from "./index.js";

const main = async () => {
	const commands: CliCommandAny[] = [
		new Flatten(),
		new GenerateV1(),
		new GenerateV2(),
		new Get(),
		new Labels(),
		new Relocate(),
		new Resize(),
	];
	const cli = new Cli(commands);
	cli.logger.setLogLevel("debug");
	await cli.exec();
};

//if main process
if (isMain(import.meta.url)) {
	main()
		.then(() => {
			process.exit(0);
		})
		.catch((err) => {
			console.log("error", err);
			process.exit(1);
		});
}
