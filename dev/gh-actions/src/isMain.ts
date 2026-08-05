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
 * Whether the module at `moduleUrl` is the script node was asked to run.
 *
 * Each file here is both a CLI entrypoint and a module. Without this guard the
 * `main()` call at the bottom ran on import — so importing anything from these
 * files performed a network fetch or a GitHub mutation as a side effect, which
 * is also why they could not be tested.
 *
 * `argv[1]` is compared as a resolved path rather than a URL because node
 * reports it as a filesystem path, and it may be a relative one.
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
		// A non-file: URL cannot be the entrypoint node was given.
		return false;
	}
};
