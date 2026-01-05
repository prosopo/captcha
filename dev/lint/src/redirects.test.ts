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

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import fg from "fast-glob";
import { buildRedirectsCommand, findTemplateFiles } from "./redirects.js";

vi.mock("node:fs");
vi.mock("fast-glob");

describe("redirects", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(process, "cwd").mockReturnValue("/workspace/captcha/dev/lint");
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("buildRedirectsCommand", () => {
		it("should return command configuration with correct structure", () => {
			const command = buildRedirectsCommand();
			expect(command.command).toBe("redirects");
			expect(command.describe).toBe("Check the redirects in the workspace");
			expect(command.builder).toBeDefined();
			expect(command.handler).toBeDefined();
		});

		it("should configure yargs with fix and pkg options", () => {
			const command = buildRedirectsCommand();
			const yargsMock = {
				option: vi.fn().mockReturnThis(),
			};
			command.builder(yargsMock as any);
			expect(yargsMock.option).toHaveBeenCalledWith("fix", {
				alias: "f",
				type: "boolean",
				default: false,
			});
			expect(yargsMock.option).toHaveBeenCalledWith("pkg", {
				alias: "p",
			});
		});
	});

	describe("findTemplateFiles", () => {
		it("should return empty array when src directory does not exist", async () => {
			vi.mocked(fs.existsSync).mockReturnValue(false);

			const result = await findTemplateFiles("/path/to");
			expect(result).toEqual([]);
		});

		it("should find markdown and nunjucks files", async () => {
			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fg).mockResolvedValue([
				"/path/to/src/file.md",
				"/path/to/src/file.njk",
			]);

			const result = await findTemplateFiles("/path/to");
			expect(result).toHaveLength(2);
		});

		it("should return empty array on error", async () => {
			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fg).mockRejectedValue(new Error("Error"));

			const result = await findTemplateFiles("/path/to");
			expect(result).toEqual([]);
		});
	});

	describe("redirects handler", () => {
		it("should pass when all internal links have trailing slashes", async () => {
			const command = buildRedirectsCommand();
			const markdownContent = "[Link](/path/)\n";

			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fg).mockResolvedValue(["/path/to/src/file.md"]);
			vi.mocked(fs.readFileSync).mockReturnValue(markdownContent as any);

			await expect(
				command.handler({ fix: false, pkg: "/path/to" }),
			).resolves.not.toThrow();
		});

		it("should throw error when internal link missing trailing slash", async () => {
			const command = buildRedirectsCommand();
			const markdownContent = "[Link](/path)\n";

			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fg).mockResolvedValue(["/path/to/src/file.md"]);
			vi.mocked(fs.readFileSync).mockReturnValue(markdownContent as any);

			await expect(
				command.handler({ fix: false, pkg: "/path/to" }),
			).rejects.toThrow();
		});

		it("should fix links when fix is true", async () => {
			const command = buildRedirectsCommand();
			const markdownContent = "[Link](/path)\n";

			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fg).mockResolvedValue(["/path/to/src/file.md"]);
			vi.mocked(fs.readFileSync).mockReturnValue(markdownContent as any);

			await command.handler({ fix: true, pkg: "/path/to" });

			expect(fs.writeFileSync).toHaveBeenCalled();
			const writtenContent = vi.mocked(fs.writeFileSync).mock.calls[0]?.[1] as string;
			expect(writtenContent).toContain("/path/");
		});

		it("should not require trailing slash for external links", async () => {
			const command = buildRedirectsCommand();
			const markdownContent = "[Link](https://example.com/path)\n";

			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fg).mockResolvedValue(["/path/to/src/file.md"]);
			vi.mocked(fs.readFileSync).mockReturnValue(markdownContent as any);

			await expect(
				command.handler({ fix: false, pkg: "/path/to" }),
			).resolves.not.toThrow();
		});

		it("should not require trailing slash for links with fragments", async () => {
			const command = buildRedirectsCommand();
			const markdownContent = "[Link](/path#section)\n";

			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fg).mockResolvedValue(["/path/to/src/file.md"]);
			vi.mocked(fs.readFileSync).mockReturnValue(markdownContent as any);

			await expect(
				command.handler({ fix: false, pkg: "/path/to" }),
			).resolves.not.toThrow();
		});

		it("should not require trailing slash for links with query params", async () => {
			const command = buildRedirectsCommand();
			const markdownContent = "[Link](/path?param=value)\n";

			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fg).mockResolvedValue(["/path/to/src/file.md"]);
			vi.mocked(fs.readFileSync).mockReturnValue(markdownContent as any);

			await expect(
				command.handler({ fix: false, pkg: "/path/to" }),
			).resolves.not.toThrow();
		});

		it("should not require trailing slash for file extensions", async () => {
			const command = buildRedirectsCommand();
			const markdownContent = "[Link](/path/file.html)\n";

			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fg).mockResolvedValue(["/path/to/src/file.md"]);
			vi.mocked(fs.readFileSync).mockReturnValue(markdownContent as any);

			await expect(
				command.handler({ fix: false, pkg: "/path/to" }),
			).resolves.not.toThrow();
		});

		it("should handle HTML links", async () => {
			const command = buildRedirectsCommand();
			const htmlContent = '<a href="/path/">Link</a>\n';

			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fg).mockResolvedValue(["/path/to/src/file.md"]);
			vi.mocked(fs.readFileSync).mockReturnValue(htmlContent as any);

			await expect(
				command.handler({ fix: false, pkg: "/path/to" }),
			).resolves.not.toThrow();
		});

		it("should handle multiple files", async () => {
			const command = buildRedirectsCommand();
			const markdownContent1 = "[Link](/path/)\n";
			const markdownContent2 = "[Link2](/path2/)\n";

			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fg).mockResolvedValue([
				"/path/to/src/file1.md",
				"/path/to/src/file2.md",
			]);
			vi.mocked(fs.readFileSync)
				.mockReturnValueOnce(markdownContent1 as any)
				.mockReturnValueOnce(markdownContent2 as any);

			await expect(
				command.handler({ fix: false, pkg: "/path/to" }),
			).resolves.not.toThrow();
		});
	});
});

