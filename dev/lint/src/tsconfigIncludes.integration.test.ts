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
import { buildTsconfigIncludesCommand } from "./tsconfigIncludes.js";

describe("tsconfigIncludes integration", () => {
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

	describe("tsconfigIncludes command", () => {
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

			const command = buildTsconfigIncludesCommand();

			await expect(
				command.handler({ pkg: pkgPath, fix: false }),
			).rejects.toThrow("is not a workspace");
		});

		it("should pass when tsconfig has all required includes", async () => {
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

			// Create packages directory and a package with proper tsconfig
			const packagesDir = path.join(tempDir, "packages");
			fs.mkdirSync(packagesDir);
			const testPkgDir = path.join(packagesDir, "test");
			fs.mkdirSync(testPkgDir);

			// Create tsconfig.json with all required includes
			const tsconfigPath = path.join(testPkgDir, "tsconfig.json");
			fs.writeFileSync(
				tsconfigPath,
				JSON.stringify({
					include: [
						"src/**/*.ts",
						"src/**/*.tsx",
						"src/**/*.json",
						"src/**/*.d.ts",
					],
				}),
			);

			const command = buildTsconfigIncludesCommand();

			// Should not throw
			await expect(
				command.handler({ pkg: workspacePkgPath, fix: false }),
			).resolves.not.toThrow();
		});

		it("should throw error when tsconfig missing ts files include", async () => {
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

			// Create packages directory and a package with incomplete tsconfig
			const packagesDir = path.join(tempDir, "packages");
			fs.mkdirSync(packagesDir);
			const testPkgDir = path.join(packagesDir, "test");
			fs.mkdirSync(testPkgDir);

			// Create tsconfig.json missing ts files include
			const tsconfigPath = path.join(testPkgDir, "tsconfig.json");
			fs.writeFileSync(
				tsconfigPath,
				JSON.stringify({
					include: ["src/**/*.tsx", "src/**/*.json", "src/**/*.d.ts"],
				}),
			);

			const command = buildTsconfigIncludesCommand();

			await expect(
				command.handler({ pkg: workspacePkgPath, fix: false }),
			).rejects.toThrow("does not include ts files");
		});

		it("should throw error when tsconfig missing tsx files include", async () => {
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

			// Create packages directory and a package with incomplete tsconfig
			const packagesDir = path.join(tempDir, "packages");
			fs.mkdirSync(packagesDir);
			const testPkgDir = path.join(packagesDir, "test");
			fs.mkdirSync(testPkgDir);

			// Create tsconfig.json missing tsx files include
			const tsconfigPath = path.join(testPkgDir, "tsconfig.json");
			fs.writeFileSync(
				tsconfigPath,
				JSON.stringify({
					include: ["src/**/*.ts", "src/**/*.json", "src/**/*.d.ts"],
				}),
			);

			const command = buildTsconfigIncludesCommand();

			await expect(
				command.handler({ pkg: workspacePkgPath, fix: false }),
			).rejects.toThrow("does not include tsx files");
		});

		it("should throw error when tsconfig missing json files include", async () => {
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

			// Create packages directory and a package with incomplete tsconfig
			const packagesDir = path.join(tempDir, "packages");
			fs.mkdirSync(packagesDir);
			const testPkgDir = path.join(packagesDir, "test");
			fs.mkdirSync(testPkgDir);

			// Create tsconfig.json missing json files include
			const tsconfigPath = path.join(testPkgDir, "tsconfig.json");
			fs.writeFileSync(
				tsconfigPath,
				JSON.stringify({
					include: ["src/**/*.ts", "src/**/*.tsx", "src/**/*.d.ts"],
				}),
			);

			const command = buildTsconfigIncludesCommand();

			await expect(
				command.handler({ pkg: workspacePkgPath, fix: false }),
			).rejects.toThrow("does not include json files");
		});

		it("should throw error when tsconfig missing d.ts files include", async () => {
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

			// Create packages directory and a package with incomplete tsconfig
			const packagesDir = path.join(tempDir, "packages");
			fs.mkdirSync(packagesDir);
			const testPkgDir = path.join(packagesDir, "test");
			fs.mkdirSync(testPkgDir);

			// Create tsconfig.json missing d.ts files include
			const tsconfigPath = path.join(testPkgDir, "tsconfig.json");
			fs.writeFileSync(
				tsconfigPath,
				JSON.stringify({
					include: ["src/**/*.ts", "src/**/*.tsx", "src/**/*.json"],
				}),
			);

			const command = buildTsconfigIncludesCommand();

			await expect(
				command.handler({ pkg: workspacePkgPath, fix: false }),
			).rejects.toThrow("does not include d.ts files");
		});

		it("should fix missing includes when fix is true", async () => {
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

			// Create packages directory and a package with incomplete tsconfig
			const packagesDir = path.join(tempDir, "packages");
			fs.mkdirSync(packagesDir);
			const testPkgDir = path.join(packagesDir, "test");
			fs.mkdirSync(testPkgDir);

			// Create tsconfig.json with partial includes
			const tsconfigPath = path.join(testPkgDir, "tsconfig.json");
			const originalTsconfig = {
				include: ["src/**/*.ts"],
			};
			fs.writeFileSync(tsconfigPath, JSON.stringify(originalTsconfig, null, 2));

			const command = buildTsconfigIncludesCommand();

			await command.handler({ pkg: workspacePkgPath, fix: true });

			// Check that tsconfig was updated with missing includes
			const updatedTsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf8"));
			expect(updatedTsconfig.include).toContain("src/**/*.ts");
			expect(updatedTsconfig.include).toContain("src/**/*.tsx");
			expect(updatedTsconfig.include).toContain("src/**/*.json");
			expect(updatedTsconfig.include).toContain("src/**/*.d.ts");
		});

		it("should throw error when include property is invalid", async () => {
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

			// Create packages directory and a package with invalid tsconfig
			const packagesDir = path.join(tempDir, "packages");
			fs.mkdirSync(packagesDir);
			const testPkgDir = path.join(packagesDir, "test");
			fs.mkdirSync(testPkgDir);

			// Create tsconfig.json with invalid include property
			const tsconfigPath = path.join(testPkgDir, "tsconfig.json");
			fs.writeFileSync(
				tsconfigPath,
				JSON.stringify({
					include: "invalid", // Should be an array
				}),
			);

			const command = buildTsconfigIncludesCommand();

			await expect(
				command.handler({ pkg: workspacePkgPath, fix: false }),
			).rejects.toThrow("include property");
		});

		it("should handle missing include property", async () => {
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

			// Create packages directory and a package with tsconfig missing include
			const packagesDir = path.join(tempDir, "packages");
			fs.mkdirSync(packagesDir);
			const testPkgDir = path.join(packagesDir, "test");
			fs.mkdirSync(testPkgDir);

			// Create tsconfig.json without include property
			const tsconfigPath = path.join(testPkgDir, "tsconfig.json");
			fs.writeFileSync(
				tsconfigPath,
				JSON.stringify({
					compilerOptions: {},
				}),
			);

			const command = buildTsconfigIncludesCommand();

			await command.handler({ pkg: workspacePkgPath, fix: true });

			// Check that include property was added
			const updatedTsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf8"));
			expect(updatedTsconfig.include).toContain("src/**/*.ts");
			expect(updatedTsconfig.include).toContain("src/**/*.tsx");
			expect(updatedTsconfig.include).toContain("src/**/*.json");
			expect(updatedTsconfig.include).toContain("src/**/*.d.ts");
		});
	});
});