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
import { buildTestCheckCommand } from "./testCheck.js";

vi.mock("node:fs");
vi.mock("fast-glob");

describe("testCheck", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("buildTestCheckCommand", () => {
		it("should return command configuration with correct structure", () => {
			const command = buildTestCheckCommand();
			expect(command.command).toBe("testCheck");
			expect(command.describe).toBe(
				"Check packages that have tests have an npm script to run them",
			);
			expect(command.builder).toBeDefined();
			expect(command.handler).toBeDefined();
		});

		it("should configure yargs with pkg option", () => {
			const command = buildTestCheckCommand();
			const yargsMock = {
				option: vi.fn().mockReturnThis(),
			};
			command.builder(yargsMock as any);
			expect(yargsMock.option).toHaveBeenCalledWith("pkg", {
				alias: "p",
			});
		});
	});

	describe("testCheck handler", () => {
		it("should throw error when package.json is not a workspace", async () => {
			const command = buildTestCheckCommand();
			const pkgJson = {};
			vi.mocked(fs.readFileSync).mockReturnValue(
				JSON.stringify(pkgJson) as any,
			);

			await expect(
				command.handler({ pkg: "/path/to/package.json" }),
			).rejects.toThrow("is not a workspace");
		});

		it("should pass when package has test script and test files", async () => {
			const command = buildTestCheckCommand();
			const pkgJson = {
				workspaces: ["packages/*"],
			};
			const packagePkgJson = {
				scripts: {
					test: "vitest run",
				},
			};

			vi.mocked(fs.readFileSync)
				.mockReturnValueOnce(JSON.stringify(pkgJson) as any)
				.mockReturnValueOnce(JSON.stringify(packagePkgJson) as any);
			vi.mocked(fg.globSync)
				.mockReturnValueOnce(["/path/to/packages/test/package.json"])
				.mockReturnValueOnce([
					"/path/to/packages/test/src/file.test.ts",
				]);

			await expect(
				command.handler({ pkg: "/path/to/package.json" }),
			).resolves.not.toThrow();
		});

		it("should pass when package has no test script and no test files", async () => {
			const command = buildTestCheckCommand();
			const pkgJson = {
				workspaces: ["packages/*"],
			};
			const packagePkgJson = {};

			vi.mocked(fs.readFileSync)
				.mockReturnValueOnce(JSON.stringify(pkgJson) as any)
				.mockReturnValueOnce(JSON.stringify(packagePkgJson) as any);
			vi.mocked(fg.globSync)
				.mockReturnValueOnce(["/path/to/packages/test/package.json"])
				.mockReturnValueOnce([]);

			await expect(
				command.handler({ pkg: "/path/to/package.json" }),
			).resolves.not.toThrow();
		});

		it("should throw error when package has test script but no test files", async () => {
			const command = buildTestCheckCommand();
			const pkgJson = {
				workspaces: ["packages/*"],
			};
			const packagePkgJson = {
				scripts: {
					test: "vitest run",
				},
			};

			vi.mocked(fs.readFileSync)
				.mockReturnValueOnce(JSON.stringify(pkgJson) as any)
				.mockReturnValueOnce(JSON.stringify(packagePkgJson) as any);
			vi.mocked(fg.globSync)
				.mockReturnValueOnce(["/path/to/packages/test/package.json"])
				.mockReturnValueOnce([]);

			await expect(
				command.handler({ pkg: "/path/to/package.json" }),
			).rejects.toThrow("has a test script but no test files");
		});

		it("should throw error when package has test files but no test script", async () => {
			const command = buildTestCheckCommand();
			const pkgJson = {
				workspaces: ["packages/*"],
			};
			const packagePkgJson = {};

			vi.mocked(fs.readFileSync)
				.mockReturnValueOnce(JSON.stringify(pkgJson) as any)
				.mockReturnValueOnce(JSON.stringify(packagePkgJson) as any);
			vi.mocked(fg.globSync)
				.mockReturnValueOnce(["/path/to/packages/test/package.json"])
				.mockReturnValueOnce([
					"/path/to/packages/test/src/file.test.ts",
				]);

			await expect(
				command.handler({ pkg: "/path/to/package.json" }),
			).rejects.toThrow("has test files but no test script");
		});

		it("should check multiple test file patterns", async () => {
			const command = buildTestCheckCommand();
			const pkgJson = {
				workspaces: ["packages/*"],
			};
			const packagePkgJson = {
				scripts: {
					test: "vitest run",
				},
			};

			vi.mocked(fs.readFileSync)
				.mockReturnValueOnce(JSON.stringify(pkgJson) as any)
				.mockReturnValueOnce(JSON.stringify(packagePkgJson) as any);
			vi.mocked(fg.globSync)
				.mockReturnValueOnce(["/path/to/packages/test/package.json"])
				.mockReturnValueOnce([
					"/path/to/packages/test/src/file.test.ts",
					"/path/to/packages/test/src/file.spec.ts",
					"/path/to/packages/test/src/file.test.tsx",
					"/path/to/packages/test/src/file.spec.tsx",
				]);

			await expect(
				command.handler({ pkg: "/path/to/package.json" }),
			).resolves.not.toThrow();
		});
	});
});

