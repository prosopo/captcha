// Copyright 2021-2026 Prosopo (UK) Ltd.
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

import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Whether this module is the process entrypoint.
 *
 * Guards the side effect in index.ts. Without it, importing the package — as
 * the tests do — ran the bot.
 */
export const isMain = (
	moduleUrl: string,
	argv: string[] = process.argv,
): boolean => {
	const entry = argv[1];
	if (entry === undefined) {
		return false;
	}
	try {
		return path.resolve(entry) === path.resolve(fileURLToPath(moduleUrl));
	} catch {
		// A module url that is not a file url — a data: or http: import — is by
		// definition not the argv entrypoint.
		return false;
	}
};
