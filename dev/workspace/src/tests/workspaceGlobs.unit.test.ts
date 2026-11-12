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
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getWorkspacePatterns } from "../workspaceGlobs.js";

describe("getWorkspacePatterns", () => {
	let dir: string;
	let pkg: string;

	beforeEach(() => {
		dir = fs.mkdtempSync(path.join(os.tmpdir(), "workspace-globs-"));
		pkg = path.join(dir, "package.json");
		fs.writeFileSync(pkg, "{}");
	});

	afterEach(() => {
		fs.rmSync(dir, { recursive: true, force: true });
	});

	it("joins the suffix onto each member glob under the root", () => {
		fs.writeFileSync(
			path.join(dir, "pnpm-workspace.yaml"),
			"packages:\n  - packages/*\n  - dev/*\n",
		);
		expect(getWorkspacePatterns(pkg, "package.json")).toEqual([
			`${dir}/packages/*/package.json`,
			`${dir}/dev/*/package.json`,
		]);
	});

	it("turns excluded members into negative patterns", () => {
		fs.writeFileSync(
			path.join(dir, "pnpm-workspace.yaml"),
			"packages:\n  - packages/*\n  - '!packages/docs'\n",
		);
		expect(getWorkspacePatterns(pkg, "package.json")).toEqual([
			`${dir}/packages/*/package.json`,
			`!${dir}/packages/docs/package.json`,
		]);
	});

	it("throws when there is no pnpm-workspace.yaml", () => {
		expect(() => getWorkspacePatterns(pkg, "package.json")).toThrow(
			"is not a workspace",
		);
	});

	it("throws when the file lists no packages", () => {
		fs.writeFileSync(
			path.join(dir, "pnpm-workspace.yaml"),
			"overrides:\n  foo: 1.0.0\n",
		);
		expect(() => getWorkspacePatterns(pkg, "package.json")).toThrow(
			"has no list of packages",
		);
	});
});
