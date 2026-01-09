// Copyright 2021-2025 Prosopo (UK) Ltd.
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
import { buildJsonCommand } from "./json.js";

describe("json integration", () => {
	let tempDir: string;

	beforeEach(() => {
		// Create a temporary directory for each test
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "lint-test-"));
	});

	afterEach(() => {
		// Clean up temporary directory after each test
		if (fs.existsSync(tempDir)) {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	});

	describe("json command", () => {
		it("should throw error when package.json is not a workspace", async () => {
			// Create a non-workspace package.json
			const pkgPath = path.join(tempDir, "package.json");
			fs.writeFileSync(
				pkgPath,
				JSON.stringify({
					name: "test-package",
					version: "1.0.0",
				}),
			);

			const command = buildJsonCommand();

			await expect(
				command.handler({ pkg: pkgPath }),
			).rejects.toThrow("is not a workspace");
		});

		it("should validate valid JSON files", async () => {
			// Create workspace package.json
			const workspacePkgPath = path.join(tempDir, "package.json");
			fs.writeFileSync(
				workspacePkgPath,
				JSON.stringify({
					name: "test-workspace",
					version: "1.0.0",
					workspaces: ["packages/*"],
				}),
			);

			// Create packages directory and a package with valid JSON
			const packagesDir = path.join(tempDir, "packages");
			fs.mkdirSync(packagesDir);
			const testPkgDir = path.join(packagesDir, "test");
			fs.mkdirSync(testPkgDir);
			const jsonFilePath = path.join(testPkgDir, "config.json");
			fs.writeFileSync(
				jsonFilePath,
				JSON.stringify({ key: "value", number: 42 }),
			);

			const command = buildJsonCommand();

			// Should not throw
			await expect(
				command.handler({ pkg: workspacePkgPath }),
			).resolves.not.toThrow();
		});

		it("should throw error for invalid JSON files", async () => {
			// Create workspace package.json
			const workspacePkgPath = path.join(tempDir, "package.json");
			fs.writeFileSync(
				workspacePkgPath,
				JSON.stringify({
					name: "test-workspace",
					version: "1.0.0",
					workspaces: ["packages/*"],
				}),
			);

			// Create packages directory and a package with invalid JSON
			const packagesDir = path.join(tempDir, "packages");
			fs.mkdirSync(packagesDir);
			const testPkgDir = path.join(packagesDir, "test");
			fs.mkdirSync(testPkgDir);
			const jsonFilePath = path.join(testPkgDir, "config.json");
			fs.writeFileSync(jsonFilePath, "{ invalid json content }");

			const command = buildJsonCommand();

			await expect(
				command.handler({ pkg: workspacePkgPath }),
			).rejects.toThrow("Unable to parse");
		});

		it("should read gitignore when it exists", async () => {
			// Create workspace package.json
			const workspacePkgPath = path.join(tempDir, "package.json");
			fs.writeFileSync(
				workspacePkgPath,
				JSON.stringify({
					name: "test-workspace",
					version: "1.0.0",
					workspaces: ["packages/*"],
				}),
			);

			// Create .gitignore file
			const gitignorePath = path.join(tempDir, ".gitignore");
			fs.writeFileSync(gitignorePath, "node_modules/\ndist/\n");

			// Create packages directory
			const packagesDir = path.join(tempDir, "packages");
			fs.mkdirSync(packagesDir);

			const command = buildJsonCommand();

			// Should not throw and should handle gitignore
			await expect(
				command.handler({ pkg: workspacePkgPath }),
			).resolves.not.toThrow();
		});

		it("should handle multiple JSON files", async () => {
			// Create workspace package.json
			const workspacePkgPath = path.join(tempDir, "package.json");
			fs.writeFileSync(
				workspacePkgPath,
				JSON.stringify({
					name: "test-workspace",
					version: "1.0.0",
					workspaces: ["packages/*"],
				}),
			);

			// Create packages directory and multiple packages with JSON files
			const packagesDir = path.join(tempDir, "packages");
			fs.mkdirSync(packagesDir);

			// Package 1
			const testPkg1Dir = path.join(packagesDir, "pkg1");
			fs.mkdirSync(testPkg1Dir);
			const json1Path = path.join(testPkg1Dir, "config.json");
			fs.writeFileSync(json1Path, JSON.stringify({ name: "pkg1", version: "1.0.0" }));

			// Package 2
			const testPkg2Dir = path.join(packagesDir, "pkg2");
			fs.mkdirSync(testPkg2Dir);
			const json2Path = path.join(testPkg2Dir, "settings.json");
			fs.writeFileSync(json2Path, JSON.stringify({ enabled: true, count: 10 }));

			const command = buildJsonCommand();

			// Should not throw
			await expect(
				command.handler({ pkg: workspacePkgPath }),
			).resolves.not.toThrow();
		});

		it("should parse gitignore correctly", async () => {
			// Create workspace package.json
			const workspacePkgPath = path.join(tempDir, "package.json");
			fs.writeFileSync(
				workspacePkgPath,
				JSON.stringify({
					name: "test-workspace",
					version: "1.0.0",
					workspaces: ["packages/*"],
				}),
			);

			// Create .gitignore file with comments and empty lines
			const gitignorePath = path.join(tempDir, ".gitignore");
			fs.writeFileSync(
				gitignorePath,
				"node_modules/\n# This is a comment\ndist/\n\ncoverage/\n",
			);

			// Create packages directory
			const packagesDir = path.join(tempDir, "packages");
			fs.mkdirSync(packagesDir);

			const command = buildJsonCommand();

			// Should not throw and should parse gitignore correctly
			await expect(
				command.handler({ pkg: workspacePkgPath }),
			).resolves.not.toThrow();
		});
	});
});