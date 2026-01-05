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
import fg from "fast-glob";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildLicenseCommand } from "./license.js";

vi.mock("node:fs");
vi.mock("fast-glob");

describe("license", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("buildLicenseCommand", () => {
		it("should return command configuration with correct structure", () => {
			const command = buildLicenseCommand();
			expect(command.command).toBe("license");
			expect(command.describe).toBe("Check the license in the workspace");
			expect(command.builder).toBeDefined();
			expect(command.handler).toBeDefined();
		});

		it("should configure yargs with pkg, fix, ignore, and list options", () => {
			const command = buildLicenseCommand();
			const yargsMock = {
				option: vi.fn().mockReturnThis(),
			};
			command.builder(yargsMock as any);
			expect(yargsMock.option).toHaveBeenCalledWith("pkg", {
				alias: "p",
			});
			expect(yargsMock.option).toHaveBeenCalledWith("fix", {
				alias: "f",
				type: "boolean",
				default: false,
			});
			expect(yargsMock.option).toHaveBeenCalledWith("ignore", {
				alias: "i",
				type: "array",
				string: true,
				default: [],
			});
			expect(yargsMock.option).toHaveBeenCalledWith("list", {
				alias: "l",
				type: "boolean",
				default: false,
			});
		});
	});

	describe("license handler", () => {
		const licenseHeader = `// Copyright 2021-${new Date().getFullYear()} Prosopo (UK) Ltd.
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

		it("should pass when file has license header", async () => {
			const command = buildLicenseCommand();
			const fileContent = `${licenseHeader}\n\nconst x = 1;`;

			vi.mocked(fg.sync).mockReturnValue(["/path/to/file.ts"]);
			vi.mocked(fs.lstatSync).mockReturnValue({ isFile: () => true } as any);
			vi.mocked(fs.readFileSync).mockReturnValue(fileContent as any);

			await expect(
				command.handler({
					pkg: "/path/to",
					fix: false,
					ignore: [],
					list: false,
				}),
			).resolves.not.toThrow();
		});

		it("should throw error when file missing license header", async () => {
			const command = buildLicenseCommand();
			const fileContent = "const x = 1;";

			vi.mocked(fg.sync).mockReturnValue(["/path/to/file.ts"]);
			vi.mocked(fs.lstatSync).mockReturnValue({ isFile: () => true } as any);
			vi.mocked(fs.readFileSync).mockReturnValue(fileContent as any);

			await expect(
				command.handler({
					pkg: "/path/to",
					fix: false,
					ignore: [],
					list: false,
				}),
			).rejects.toThrow("License not present");
		});

		it("should list files when list option is true", async () => {
			const command = buildLicenseCommand();
			const fileContent = `${licenseHeader}\n\nconst x = 1;`;

			vi.mocked(fg.sync).mockReturnValue(["/path/to/file.ts"]);
			vi.mocked(fs.lstatSync).mockReturnValue({ isFile: () => true } as any);
			vi.mocked(fs.readFileSync).mockReturnValue(fileContent as any);

			const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

			await command.handler({
				pkg: "/path/to",
				fix: false,
				ignore: [],
				list: true,
			});

			expect(consoleSpy).toHaveBeenCalled();
			consoleSpy.mockRestore();
		});

		it("should fix file missing license when fix is true", async () => {
			const command = buildLicenseCommand();
			const fileContent = "const x = 1;";

			vi.mocked(fg.sync).mockReturnValue(["/path/to/file.ts"]);
			vi.mocked(fs.lstatSync).mockReturnValue({ isFile: () => true } as any);
			vi.mocked(fs.readFileSync).mockReturnValue(fileContent as any);

			await command.handler({
				pkg: "/path/to",
				fix: true,
				ignore: [],
				list: false,
			});

			expect(fs.writeFileSync).toHaveBeenCalled();
			const writtenContent = vi.mocked(fs.writeFileSync).mock
				.calls[0]?.[1] as string;
			expect(writtenContent).toContain(licenseHeader);
			expect(writtenContent).toContain("const x = 1;");
		});

		it("should replace old license when fix is true", async () => {
			const command = buildLicenseCommand();
			const oldLicense = `// Copyright 2021-2023 Prosopo (UK) Ltd.
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
			const fileContent = `${oldLicense}\n\nconst x = 1;`;

			vi.mocked(fg.sync).mockReturnValue(["/path/to/file.ts"]);
			vi.mocked(fs.lstatSync).mockReturnValue({ isFile: () => true } as any);
			vi.mocked(fs.readFileSync).mockReturnValue(fileContent as any);

			await command.handler({
				pkg: "/path/to",
				fix: true,
				ignore: [],
				list: false,
			});

			expect(fs.writeFileSync).toHaveBeenCalled();
		});

		it("should handle multiple files", async () => {
			const command = buildLicenseCommand();
			const fileContent1 = `${licenseHeader}\n\nconst x = 1;`;
			const fileContent2 = `${licenseHeader}\n\nconst y = 2;`;

			vi.mocked(fg.sync).mockReturnValue([
				"/path/to/file1.ts",
				"/path/to/file2.ts",
			]);
			vi.mocked(fs.lstatSync).mockReturnValue({ isFile: () => true } as any);
			vi.mocked(fs.readFileSync)
				.mockReturnValueOnce(fileContent1 as any)
				.mockReturnValueOnce(fileContent2 as any);

			await expect(
				command.handler({
					pkg: "/path/to",
					fix: false,
					ignore: [],
					list: false,
				}),
			).resolves.not.toThrow();
		});

		it("should respect ignore patterns", async () => {
			const command = buildLicenseCommand();
			const fileContent = "const x = 1;";

			// When ignore patterns are used, fg.sync should filter them out
			vi.mocked(fg.sync).mockReturnValue([]);
			vi.mocked(fs.lstatSync).mockReturnValue({ isFile: () => true } as any);
			vi.mocked(fs.readFileSync).mockReturnValue(fileContent as any);

			await expect(
				command.handler({
					pkg: "/path/to",
					fix: false,
					ignore: ["**/file.ts"],
					list: false,
				}),
			).resolves.not.toThrow();
		});

		it("should filter out directories", async () => {
			const command = buildLicenseCommand();
			const fileContent = `${licenseHeader}\n\nconst x = 1;`;

			vi.mocked(fg.sync).mockReturnValue(["/path/to/file.ts", "/path/to/dir"]);
			vi.mocked(fs.lstatSync)
				.mockReturnValueOnce({ isFile: () => true } as any)
				.mockReturnValueOnce({ isFile: () => false } as any);
			vi.mocked(fs.readFileSync).mockReturnValue(fileContent as any);

			await expect(
				command.handler({
					pkg: "/path/to",
					fix: false,
					ignore: [],
					list: false,
				}),
			).resolves.not.toThrow();
		});
	});
});
