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

export interface CopyAssetEntry {
	src: string;
	/** Basename to write into `outDir`. */
	dest: string;
}

/**
 * Copy files verbatim next to the bundle, leaving the module graph alone.
 *
 * Distinct from {@link nodejsPolarsNativeFilePlugin}, which also rewrites any
 * import of the file into a `createRequire` of the copy. That rewrite suits
 * .node addons and nothing else: an ES module rewritten that way fails at
 * runtime, because `require()` refuses an ESM file.
 *
 * This is for assets the bundle loads by path at runtime rather than by
 * import — where the point is that the file stays a separate file with a
 * stable name that code can construct a URL for.
 */
export const copyAssetsPlugin = (assets: CopyAssetEntry[], outDir: string) => {
	const name = "copy-assets-plugin";
	return {
		name,
		generateBundle() {
			for (const { src, dest } of assets) {
				const out = path.join(outDir, dest);
				console.debug(name, "copy", src, "to", out);
				fs.mkdirSync(path.dirname(out), { recursive: true });
				fs.copyFileSync(src, out);
			}
		},
	};
};
