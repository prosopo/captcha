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
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { packageDir } from "../packageDir.js";

describe("packageDir", () => {
	let root: string;

	beforeEach(() => {
		root = fs.mkdtempSync(path.join(os.tmpdir(), "packageDir-"));
		fs.writeFileSync(path.join(root, "package.json"), "{}");
	});

	afterEach(() => {
		fs.rmSync(root, { recursive: true, force: true });
	});

	const moduleUrl = (...segments: string[]): URL =>
		pathToFileURL(path.join(root, ...segments));

	it("finds the package from a module in src", () => {
		expect(packageDir(moduleUrl("src", "index.ts"))).toBe(root);
	});

	it("finds the same package from a deeper build variant", () => {
		expect(packageDir(moduleUrl("dist", "esm", "api", "x.js"))).toBe(root);
	});

	it("accepts the url as a string", () => {
		expect(packageDir(moduleUrl("src", "a.ts").href)).toBe(root);
	});

	it("stops at the nearest package.json", () => {
		const nested = path.join(root, "node_modules", "dep");
		fs.mkdirSync(path.join(nested, "lib"), { recursive: true });
		fs.writeFileSync(path.join(nested, "package.json"), "{}");
		expect(packageDir(pathToFileURL(path.join(nested, "lib", "i.js")))).toBe(
			nested,
		);
	});

	it("is undefined when no package.json is above the module", () => {
		fs.rmSync(path.join(root, "package.json"));
		expect(packageDir(moduleUrl("src", "a.ts"))).toBeUndefined();
	});

	it("finds this package from its own module", () => {
		const own = packageDir(import.meta.url) ?? "";
		const manifest = JSON.parse(
			fs.readFileSync(path.join(own, "package.json"), "utf8"),
		) as { name?: unknown };
		expect(manifest.name).toBe("@prosopo/util");
	});
});
