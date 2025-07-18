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

import { z } from "zod";
import { engines } from "./engines.js";
import { json } from "./json.js";
import { license } from "./license.js";
import { redirects } from "./redirects.js";
import { refs } from "./refs.js";
import { scripts } from "./scripts.js";
import { tsconfigIncludes } from "./tsconfigIncludes.js";
import { workflowNames } from "./workflowNames.js";

const main = async () => {
	const cmd = z.string().parse(process.argv[2]);
	// remove the cmd from the args
	process.argv.splice(2, 1);

	switch (cmd) {
		case "engines":
			return await engines();
		case "refs":
			return await refs();
		case "workflowNames":
			return await workflowNames();
		case "scripts":
			return await scripts();
		case "license":
			return await license();
		case "redirects":
			return await redirects();
		case "tsconfig:includes":
			return await tsconfigIncludes();
		case "json":
			return await json();
		default:
			throw new Error(`Unknown command: ${cmd}`);
	}
};

main();
