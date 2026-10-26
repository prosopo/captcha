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

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The directory of the package that contains the module at `moduleUrl`:
 * the nearest ancestor holding a package.json. Resolve package-relative paths
 * from here rather than climbing `../` from the module itself, whose depth
 * differs between `src/`, `dist/<variant>/` and a single-file bundle.
 * Undefined when nothing above has one, e.g. a bundle copied alone into an
 * image.
 */
export const packageDir = (moduleUrl: string | URL): string | undefined => {
	const start = path.dirname(fileURLToPath(moduleUrl));
	for (let dir = start; ; dir = path.dirname(dir)) {
		if (fs.existsSync(path.join(dir, "package.json"))) {
			return dir;
		}
		if (path.dirname(dir) === dir) {
			return undefined;
		}
	}
};
