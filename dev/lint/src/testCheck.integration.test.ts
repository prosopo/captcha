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
import { buildTestCheckCommand } from "./testCheck.js";

describe("testCheck integration", () => {
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

	describe("testCheck command", () => {
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

			const command = buildTestCheckCommand();

			await expect(
				command.handler({ pkg: pkgPath }),
			).rejects.toThrow("is not a workspace");
		});

		it("should pass when package has test script and test files", async () => {
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

			// Create packages directory and a package with test script and test files
			const packagesDir = path.join(tempDir, "packages");
			fs.mkdirSync(packagesDir);
			const testPkgDir = path.join(packagesDir, "test");
			fs.mkdirSync(testPkgDir);

			// Create package.json with test script
			const testPkgJsonPath = path.join(testPkgDir, "package.json");
			fs.writeFileSync(
				testPkgJsonPath,
				JSON.stringify({
					name: "@test/package",
					version: "1.0.0",
					scripts: {
						test: "vitest run",
					},
				}),
			);

			// Create src directory with test file
			const srcDir = path.join(testPkgDir, "src");
			fs.mkdirSync(srcDir);
			const testFilePath = path.join(srcDir, "example.test.ts");
			fs.writeFileSync(testFilePath, 'describe("test", () => { it("passes", () => {}); });');

			const command = buildTestCheckCommand();

			// Should not throw
			await expect(
				command.handler({ pkg: workspacePkgPath }),
			).resolves.not.toThrow();
		});

		it("should pass when package has no test script and no test files", async () => {
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

			// Create packages directory and a package without test script or test files
			const packagesDir = path.join(tempDir, "packages");
			fs.mkdirSync(packagesDir);
			const testPkgDir = path.join(packagesDir, "test");
			fs.mkdirSync(testPkgDir);

			// Create package.json without test script
			const testPkgJsonPath = path.join(testPkgDir, "package.json");
			fs.writeFileSync(
				testPkgJsonPath,
				JSON.stringify({
					name: "@test/package",
					version: "1.0.0",
				}),
			);

			const command = buildTestCheckCommand();

			// Should not throw
			await expect(
				command.handler({ pkg: workspacePkgPath }),
			).resolves.not.toThrow();
		});

		it("should throw error when package has test script but no test files", async () => {
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

			// Create packages directory and a package with test script but no test files
			const packagesDir = path.join(tempDir, "packages");
			fs.mkdirSync(packagesDir);
			const testPkgDir = path.join(packagesDir, "test");
			fs.mkdirSync(testPkgDir);

			// Create package.json with test script
			const testPkgJsonPath = path.join(testPkgDir, "package.json");
			fs.writeFileSync(
				testPkgJsonPath,
				JSON.stringify({
					name: "@test/package",
					version: "1.0.0",
					scripts: {
						test: "vitest run",
					},
				}),
			);

			const command = buildTestCheckCommand();

			await expect(
				command.handler({ pkg: workspacePkgPath }),
			).rejects.toThrow("has a test script but no test files");
		});

		it("should throw error when package has test files but no test script", async () => {
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

			// Create packages directory and a package with test files but no test script
			const packagesDir = path.join(tempDir, "packages");
			fs.mkdirSync(packagesDir);
			const testPkgDir = path.join(packagesDir, "test");
			fs.mkdirSync(testPkgDir);

			// Create package.json without test script
			const testPkgJsonPath = path.join(testPkgDir, "package.json");
			fs.writeFileSync(
				testPkgJsonPath,
				JSON.stringify({
					name: "@test/package",
					version: "1.0.0",
				}),
			);

			// Create src directory with test file
			const srcDir = path.join(testPkgDir, "src");
			fs.mkdirSync(srcDir);
			const testFilePath = path.join(srcDir, "example.test.ts");
			fs.writeFileSync(testFilePath, 'describe("test", () => { it("passes", () => {}); });');

			const command = buildTestCheckCommand();

			await expect(
				command.handler({ pkg: workspacePkgPath }),
			).rejects.toThrow("has test files but no test script");
		});

		it("should check multiple test file patterns", async () => {
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

			// Create packages directory and a package with various test file patterns
			const packagesDir = path.join(tempDir, "packages");
			fs.mkdirSync(packagesDir);
			const testPkgDir = path.join(packagesDir, "test");
			fs.mkdirSync(testPkgDir);

			// Create package.json with test script
			const testPkgJsonPath = path.join(testPkgDir, "package.json");
			fs.writeFileSync(
				testPkgJsonPath,
				JSON.stringify({
					name: "@test/package",
					version: "1.0.0",
					scripts: {
						test: "vitest run",
					},
				}),
			);

			// Create src directory with different test file patterns
			const srcDir = path.join(testPkgDir, "src");
			fs.mkdirSync(srcDir);
			fs.writeFileSync(path.join(srcDir, "example.test.ts"), 'describe("test", () => {});');
			fs.writeFileSync(path.join(srcDir, "example.spec.ts"), 'describe("spec", () => {});');
			fs.writeFileSync(path.join(srcDir, "example.test.tsx"), 'describe("tsx test", () => {});');

			const command = buildTestCheckCommand();

			// Should not throw
			await expect(
				command.handler({ pkg: workspacePkgPath }),
			).resolves.not.toThrow();
		});
	});
});