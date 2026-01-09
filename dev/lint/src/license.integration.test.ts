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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildLicenseCommand } from "./license.js";

describe("license integration", () => {
	let tempDir: string;
	let licenseHeader: string;

	beforeEach(() => {
		// Create a temporary directory for each test
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "lint-test-"));

		// License header that matches what the command generates
		licenseHeader = `// Copyright 2021-${new Date().getFullYear()} Prosopo (UK) Ltd.
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
// limitations under the License.`;
	});

	afterEach(() => {
		// Clean up temporary directory after each test
		if (fs.existsSync(tempDir)) {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	});

	describe("license command", () => {
		it("should pass when file has license header", async () => {
			// Create a TypeScript file with proper license header
			const filePath = path.join(tempDir, "test.ts");
			const fileContent = `${licenseHeader}\n\nconst x = 1;`;
			fs.writeFileSync(filePath, fileContent);

			const command = buildLicenseCommand();

			// Should not throw
			await expect(
				command.handler({
					pkg: tempDir,
					fix: false,
					ignore: [],
					list: false,
				}),
			).resolves.not.toThrow();
		});

		it("should throw error when file missing license header", async () => {
			// Create a TypeScript file without license header
			const filePath = path.join(tempDir, "test.ts");
			const fileContent = "const x = 1;";
			fs.writeFileSync(filePath, fileContent);

			const command = buildLicenseCommand();

			await expect(
				command.handler({
					pkg: tempDir,
					fix: false,
					ignore: [],
					list: false,
				}),
			).rejects.toThrow("License not present");
		});

		it("should list files when list option is true", async () => {
			// Create a TypeScript file with proper license header
			const filePath = path.join(tempDir, "test.ts");
			const fileContent = `${licenseHeader}\n\nconst x = 1;`;
			fs.writeFileSync(filePath, fileContent);

			const command = buildLicenseCommand();

			// Capture console.log output
			const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

			await command.handler({
				pkg: tempDir,
				fix: false,
				ignore: [],
				list: true,
			});

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("Found"),
				expect.any(Number),
				"files",
			);
			consoleSpy.mockRestore();
		});

		it("should fix file missing license when fix is true", async () => {
			// Create a TypeScript file without license header
			const filePath = path.join(tempDir, "test.ts");
			const originalContent = "const x = 1;";
			fs.writeFileSync(filePath, originalContent);

			const command = buildLicenseCommand();

			await command.handler({
				pkg: tempDir,
				fix: true,
				ignore: [],
				list: false,
			});

			// Check that the file was updated with the license header
			const updatedContent = fs.readFileSync(filePath, "utf8");
			expect(updatedContent).toContain(licenseHeader);
			expect(updatedContent).toContain(originalContent);
		});

		it("should replace old license when fix is true", async () => {
			// Create a TypeScript file with an old license header
			const filePath = path.join(tempDir, "test.ts");
			const oldLicense = `// Copyright (C) 2020 Prosopo Procaptcha.  If not, see <http://www.gnu.org/licenses/>.`;
			const fileContent = `${oldLicense}\n\nconst x = 1;`;
			fs.writeFileSync(filePath, fileContent);

			const command = buildLicenseCommand();

			await command.handler({
				pkg: tempDir,
				fix: true,
				ignore: [],
				list: false,
			});

			// Check that the old license was replaced with the new one
			const updatedContent = fs.readFileSync(filePath, "utf8");
			expect(updatedContent).toContain(licenseHeader);
			expect(updatedContent).not.toContain(oldLicense);
		});

		it("should handle multiple files", async () => {
			// Create multiple TypeScript files
			const file1Path = path.join(tempDir, "file1.ts");
			const file2Path = path.join(tempDir, "file2.ts");

			fs.writeFileSync(file1Path, `${licenseHeader}\n\nconst a = 1;`);
			fs.writeFileSync(file2Path, `${licenseHeader}\n\nconst b = 2;`);

			const command = buildLicenseCommand();

			// Should not throw
			await expect(
				command.handler({
					pkg: tempDir,
					fix: false,
					ignore: [],
					list: false,
				}),
			).resolves.not.toThrow();
		});

		it("should ignore files in ignored directories", async () => {
			// Create a file in node_modules (which should be ignored)
			const nodeModulesDir = path.join(tempDir, "node_modules");
			fs.mkdirSync(nodeModulesDir);
			const ignoredFilePath = path.join(nodeModulesDir, "ignored.ts");
			fs.writeFileSync(ignoredFilePath, "const x = 1;"); // No license header

			// Create a valid file
			const validFilePath = path.join(tempDir, "valid.ts");
			fs.writeFileSync(validFilePath, `${licenseHeader}\n\nconst x = 1;`);

			const command = buildLicenseCommand();

			// Should not throw because node_modules files are ignored by default
			await expect(
				command.handler({
					pkg: tempDir,
					fix: false,
					ignore: [],
					list: false,
				}),
			).resolves.not.toThrow();
		});

		it("should respect custom ignore patterns", async () => {
			// Create a file that should be ignored
			const customDir = path.join(tempDir, "custom");
			fs.mkdirSync(customDir);
			const ignoredFilePath = path.join(customDir, "ignored.ts");
			fs.writeFileSync(ignoredFilePath, "const x = 1;"); // No license header

			// Create a valid file
			const validFilePath = path.join(tempDir, "valid.ts");
			fs.writeFileSync(validFilePath, `${licenseHeader}\n\nconst x = 1;`);

			const command = buildLicenseCommand();

			// Should not throw because custom directory is ignored
			await expect(
				command.handler({
					pkg: tempDir,
					fix: false,
					ignore: ["custom/**"],
					list: false,
				}),
			).resolves.not.toThrow();
		});
	});
});