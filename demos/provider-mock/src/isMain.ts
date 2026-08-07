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

import { argv } from "node:process";
import { fileURLToPath } from "node:url";

/**
 * Whether the module at moduleUrl is the one node was asked to run.
 *
 * Guards the module's side effects so importing it — for its exports, or from a
 * test — does not start a server.
 */
export const isMain = (
	moduleUrl: string,
	entrypoint: string | undefined = argv[1],
): boolean => {
	if (entrypoint === undefined) {
		return false;
	}
	return fileURLToPath(moduleUrl) === entrypoint;
};
