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

import { builtinModules } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { type Plugin, build } from "vite";
import { describe, expect, test } from "vitest";

const source: string = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);
const entry: string = path.join(source, "loadI18next.ts");

const nodeBuiltins: string[] = [
	...builtinModules,
	...builtinModules.map((name: string): string => `node:${name}`),
];

// The Cypress spec preprocessor (demos/cypress-shared/cypress.*.config.js)
// bundles the specs, and through them this package, as UMD.
describe("a UMD browser bundle of loadI18next", () => {
	test("builds, so nothing on the backend import path uses top-level await", async () => {
		await expect(
			build({
				configFile: false,
				logLevel: "silent",
				build: {
					write: false,
					minify: false,
					reportCompressedSize: false,
					lib: { entry, name: "loadI18next", formats: ["umd"] },
					rollupOptions: { external: nodeBuiltins },
				},
			}),
		).resolves.toBeDefined();
	});
});

const EMPTY_FS = "\0empty-fs";

// The portal and other Vite apps polyfill node builtins with
// node-stdlib-browser, whose `fs` is an empty module with only a null default.
const stubFs: Plugin = {
	name: "stub-fs",
	enforce: "pre",
	resolveId: (id: string): string | undefined =>
		id === "fs" || id === "node:fs" ? EMPTY_FS : undefined,
	load: (id: string): string | undefined =>
		id === EMPTY_FS ? "export default null;" : undefined,
};

describe("an ESM browser bundle of the package with fs stubbed out", () => {
	test("builds, so nothing imports a named export from fs", async () => {
		await expect(
			build({
				configFile: false,
				logLevel: "silent",
				plugins: [stubFs],
				build: {
					write: false,
					minify: false,
					reportCompressedSize: false,
					lib: { entry: path.join(source, "index.ts"), formats: ["es"] },
					rollupOptions: {
						external: nodeBuiltins.filter(
							(name: string): boolean => name !== "fs" && name !== "node:fs",
						),
					},
				},
			}),
		).resolves.toBeDefined();
	});
});
