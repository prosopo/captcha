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

import { describe, expect, test } from "vitest";

describe("the package entrypoint", () => {
	test("has no runtime exports at all", async () => {
		// package.json declares sideEffects: false and every consumer imports this
		// with `import type`. A runtime export would be dropped by that import and
		// so would be undefined at the point of use, which is a confusing way to
		// find out the package was meant to be types only.
		const module: Record<string, unknown> = await import("../index.js");
		expect(Object.keys(module).filter((key) => key !== "default")).toEqual([]);
	});

	test("importing it runs no side effects and does not throw", async () => {
		// It is imported by the provider at startup; anything executed here would
		// run before the environment is configured.
		await expect(import("../index.js")).resolves.toBeDefined();
	});
});
