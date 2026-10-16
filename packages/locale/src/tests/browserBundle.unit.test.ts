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
import { build } from "vite";
import { describe, expect, test } from "vitest";

const entry: string = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../loadI18next.ts",
);

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
