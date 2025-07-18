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

import { buildEnginesCommand } from "./engines.js";
import { buildJsonCommand } from "./json.js";
import { buildLicenseCommand } from "./license.js";
import { buildRedirectsCommand } from "./redirects.js";
import { buildRefsCommand } from "./refs.js";
import { buildTsconfigIncludesCommand } from "./tsconfigIncludes.js";
import { buildWorkflowNamesCommand } from "./workflowNames.js";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const main = async () => {
	const args = await yargs(hideBin(process.argv))
		.command(buildEnginesCommand())
		.command(buildJsonCommand())
		.command(buildTsconfigIncludesCommand())
		.command(buildWorkflowNamesCommand())
		.command(buildLicenseCommand())
		.command(buildRedirectsCommand())
		.command(buildRefsCommand())
		.demandCommand()
		.strict()
		.help()
		.parse();
};

main();
