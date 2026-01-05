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
import { buildJsonCommand } from "./json.js";

vi.mock("node:fs");
vi.mock("fast-glob");

describe("json", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("buildJsonCommand", () => {
		it("should return command configuration with correct structure", () => {
			const command = buildJsonCommand();
			expect(command.command).toBe("json");
			expect(command.describe).toBe("Check the json files in the workspace");
			expect(command.builder).toBeDefined();
			expect(command.handler).toBeDefined();
		});

		it("should configure yargs with pkg option", () => {
			const command = buildJsonCommand();
			const yargsMock = {
				option: vi.fn().mockReturnThis(),
			};
			command.builder(yargsMock as any);
			expect(yargsMock.option).toHaveBeenCalledWith("pkg", {
				alias: "p",
			});
		});
	});

	describe("json handler", () => {
		it("should throw error when package.json is not a workspace", async () => {
			const command = buildJsonCommand();
			const pkgJson = {};
			vi.mocked(fs.readFileSync).mockReturnValue(
				JSON.stringify(pkgJson) as any,
			);

			await expect(
				command.handler({ pkg: "/path/to/package.json" }),
			).rejects.toThrow("is not a workspace");
		});

		it("should validate valid JSON files", async () => {
			const command = buildJsonCommand();
			const pkgJson = {
				workspaces: ["packages/*"],
			};
			const validJson = { key: "value" };

			vi.mocked(fs.readFileSync)
				.mockReturnValueOnce(JSON.stringify(pkgJson) as any)
				.mockReturnValueOnce(JSON.stringify(validJson) as any);
			vi.mocked(fs.existsSync).mockReturnValue(false);
			vi.mocked(fg.globSync).mockReturnValue([
				"/path/to/packages/test/file.json",
			]);

			await expect(
				command.handler({ pkg: "/path/to/package.json" }),
			).resolves.not.toThrow();
		});

		it("should throw error for invalid JSON files", async () => {
			const command = buildJsonCommand();
			const pkgJson = {
				workspaces: ["packages/*"],
			};
			const invalidJson = "{ invalid json }";

			vi.mocked(fs.readFileSync)
				.mockReturnValueOnce(JSON.stringify(pkgJson) as any)
				.mockReturnValueOnce(invalidJson as any);
			vi.mocked(fs.existsSync).mockReturnValue(false);
			vi.mocked(fg.globSync).mockReturnValue([
				"/path/to/packages/test/file.json",
			]);

			await expect(
				command.handler({ pkg: "/path/to/package.json" }),
			).rejects.toThrow("Unable to parse");
		});

		it("should read gitignore when it exists", async () => {
			const command = buildJsonCommand();
			const pkgJson = {
				workspaces: ["packages/*"],
			};
			const gitignore = "node_modules/\ndist/";

			vi.mocked(fs.readFileSync)
				.mockReturnValueOnce(JSON.stringify(pkgJson) as any)
				.mockReturnValueOnce(gitignore as any);
			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fg.globSync).mockReturnValue([]);

			await expect(
				command.handler({ pkg: "/path/to/package.json" }),
			).resolves.not.toThrow();
			expect(fs.existsSync).toHaveBeenCalled();
		});

		it("should handle multiple JSON files", async () => {
			const command = buildJsonCommand();
			const pkgJson = {
				workspaces: ["packages/*"],
			};
			const validJson1 = { key1: "value1" };
			const validJson2 = { key2: "value2" };

			vi.mocked(fs.readFileSync)
				.mockReturnValueOnce(JSON.stringify(pkgJson) as any)
				.mockReturnValueOnce(JSON.stringify(validJson1) as any)
				.mockReturnValueOnce(JSON.stringify(validJson2) as any);
			vi.mocked(fs.existsSync).mockReturnValue(false);
			vi.mocked(fg.globSync).mockReturnValue([
				"/path/to/packages/test/file1.json",
				"/path/to/packages/test/file2.json",
			]);

			await expect(
				command.handler({ pkg: "/path/to/package.json" }),
			).resolves.not.toThrow();
		});

		it("should parse gitignore correctly", async () => {
			const command = buildJsonCommand();
			const pkgJson = {
				workspaces: ["packages/*"],
			};
			const gitignore = "node_modules/\n# comment\ndist/\n\n";

			vi.mocked(fs.readFileSync)
				.mockReturnValueOnce(JSON.stringify(pkgJson) as any)
				.mockReturnValueOnce(gitignore as any);
			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fg.globSync).mockReturnValue([]);

			await expect(
				command.handler({ pkg: "/path/to/package.json" }),
			).resolves.not.toThrow();
		});
	});
});

