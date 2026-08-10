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

import fg from "fast-glob";

// package.json maps "#policy/*" to "./dist/*", so every emitted module is
// importable by consumers (the unit tests do exactly that). vite-plugin-no-bundle
// emits one file per source module either way, but rolldown prunes named exports
// that no *in-graph* module imports — rollup kept them. Left as just the four
// .export barrels, that silently drops symbols like buildScopedBlockSubQueries
// from dist and its importers fail with "is not a function" at runtime.
//
// Listing every module as an entry makes the emitted surface match what the
// "#policy/*" mapping already promises.
const sourceFiles = fg.sync("src/**/*.ts", {
	cwd: import.meta.dirname,
	ignore: ["src/tests/**"],
	// the public barrels are named ".export.ts"; without this fast-glob skips
	// every dotfile and the package loses its declared entry points.
	dot: true,
});

export const entries: Record<string, string> = Object.fromEntries(
	sourceFiles.map((file) => [
		file.replace(/^src\//, "").replace(/\.ts$/, ""),
		file,
	]),
);
