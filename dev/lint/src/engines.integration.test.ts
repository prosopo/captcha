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
import { buildEnginesCommand } from "./engines.js";

describe("engines integration", () => {
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

	describe("engines command", () => {
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

			const command = buildEnginesCommand();

			await expect(
				command.handler({ pkg: pkgPath }),
			).rejects.toThrow("is not a workspace");
		});

		it("should throw error when engines are missing from workspace", async () => {
			// Create a workspace package.json without engines
			const pkgPath = path.join(tempDir, "package.json");
			fs.writeFileSync(
				pkgPath,
				JSON.stringify({
					name: "test-workspace",
					version: "1.0.0",
					workspaces: ["packages/*"],
				}),
			);

			const command = buildEnginesCommand();

			await expect(
				command.handler({ pkg: pkgPath }),
			).rejects.toThrow();
		});

		it("should throw error when package has mismatched node version", async () => {
			// Create workspace package.json
			const workspacePkgPath = path.join(tempDir, "package.json");
			fs.writeFileSync(
				workspacePkgPath,
				JSON.stringify({
					name: "test-workspace",
					version: "1.0.0",
					workspaces: ["packages/*"],
					engines: {
						node: "^24",
						npm: "^11",
					},
				}),
			);

			// Create packages directory
			const packagesDir = path.join(tempDir, "packages");
			fs.mkdirSync(packagesDir);

			// Create a package with mismatched node version
			const testPkgDir = path.join(packagesDir, "test");
			fs.mkdirSync(testPkgDir);
			const testPkgPath = path.join(testPkgDir, "package.json");
			fs.writeFileSync(
				testPkgPath,
				JSON.stringify({
					name: "@test/package",
					version: "1.0.0",
					engines: {
						node: "^20", // Different from workspace
						npm: "^11",
					},
				}),
			);

			const command = buildEnginesCommand();

			await expect(
				command.handler({ pkg: workspacePkgPath }),
			).rejects.toThrow("has node version");
		});

		it("should pass when all engines match", async () => {
			// Create workspace package.json
			const workspacePkgPath = path.join(tempDir, "package.json");
			fs.writeFileSync(
				workspacePkgPath,
				JSON.stringify({
					name: "test-workspace",
					version: "1.0.0",
					workspaces: ["packages/*"],
					engines: {
						node: "^24",
						npm: "^11",
					},
				}),
			);

			// Create packages directory
			const packagesDir = path.join(tempDir, "packages");
			fs.mkdirSync(packagesDir);

			// Create a package with matching engines
			const testPkgDir = path.join(packagesDir, "test");
			fs.mkdirSync(testPkgDir);
			const testPkgPath = path.join(testPkgDir, "package.json");
			fs.writeFileSync(
				testPkgPath,
				JSON.stringify({
					name: "@test/package",
					version: "1.0.0",
					engines: {
						node: "^24",
						npm: "^11",
					},
				}),
			);

			const command = buildEnginesCommand();

			// Should not throw
			await expect(
				command.handler({ pkg: workspacePkgPath }),
			).resolves.not.toThrow();
		});

		it("should check multiple packages", async () => {
			// Create workspace package.json
			const workspacePkgPath = path.join(tempDir, "package.json");
			fs.writeFileSync(
				workspacePkgPath,
				JSON.stringify({
					name: "test-workspace",
					version: "1.0.0",
					workspaces: ["packages/*"],
					engines: {
						node: "^24",
						npm: "^11",
					},
				}),
			);

			// Create packages directory
			const packagesDir = path.join(tempDir, "packages");
			fs.mkdirSync(packagesDir);

			// Create first package
			const testPkg1Dir = path.join(packagesDir, "test1");
			fs.mkdirSync(testPkg1Dir);
			const testPkg1Path = path.join(testPkg1Dir, "package.json");
			fs.writeFileSync(
				testPkg1Path,
				JSON.stringify({
					name: "@test/package1",
					version: "1.0.0",
					engines: {
						node: "^24",
						npm: "^11",
					},
				}),
			);

			// Create second package
			const testPkg2Dir = path.join(packagesDir, "test2");
			fs.mkdirSync(testPkg2Dir);
			const testPkg2Path = path.join(testPkg2Dir, "package.json");
			fs.writeFileSync(
				testPkg2Path,
				JSON.stringify({
					name: "@test/package2",
					version: "1.0.0",
					engines: {
						node: "^24",
						npm: "^11",
					},
				}),
			);

			const command = buildEnginesCommand();

			// Should not throw
			await expect(
				command.handler({ pkg: workspacePkgPath }),
			).resolves.not.toThrow();
		});
	});
});