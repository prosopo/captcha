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
import { buildTsconfigIncludesCommand } from "./tsconfigIncludes.js";

vi.mock("node:fs");
vi.mock("fast-glob");

describe("tsconfigIncludes", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("buildTsconfigIncludesCommand", () => {
		it("should return command configuration with correct structure", () => {
			const command = buildTsconfigIncludesCommand();
			expect(command.command).toBe("tsconfigIncludes");
			expect(command.describe).toBe(
				"Check the tsconfig includes in the workspace",
			);
			expect(command.builder).toBeDefined();
			expect(command.handler).toBeDefined();
		});

		it("should configure yargs with pkg and fix options", () => {
			const command = buildTsconfigIncludesCommand();
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
		});
	});

	describe("checkTsconfigIncludes handler", () => {
		it("should throw error when package.json is not a workspace", async () => {
			const command = buildTsconfigIncludesCommand();
			const pkgJson = {};
			vi.mocked(fs.readFileSync).mockReturnValue(
				JSON.stringify(pkgJson) as any,
			);

			await expect(
				command.handler({ pkg: "/path/to/package.json", fix: false }),
			).rejects.toThrow("is not a workspace");
		});

		it("should pass when tsconfig has all required includes", async () => {
			const command = buildTsconfigIncludesCommand();
			const pkgJson = {
				workspaces: ["packages/*"],
			};
			const tsconfig = {
				include: [
					"src/**/*.ts",
					"src/**/*.tsx",
					"src/**/*.json",
					"src/**/*.d.ts",
				],
			};

			vi.mocked(fs.readFileSync)
				.mockReturnValueOnce(JSON.stringify(pkgJson) as any)
				.mockReturnValueOnce(JSON.stringify(tsconfig) as any);
			vi.mocked(fg.globSync).mockReturnValue([
				"/path/to/packages/test/tsconfig.json",
			]);

			await expect(
				command.handler({ pkg: "/path/to/package.json", fix: false }),
			).resolves.not.toThrow();
		});

		it("should throw error when tsconfig missing ts files include", async () => {
			const command = buildTsconfigIncludesCommand();
			const pkgJson = {
				workspaces: ["packages/*"],
			};
			const tsconfig = {
				include: ["src/**/*.tsx", "src/**/*.json", "src/**/*.d.ts"],
			};

			vi.mocked(fs.readFileSync)
				.mockReturnValueOnce(JSON.stringify(pkgJson) as any)
				.mockReturnValueOnce(JSON.stringify(tsconfig) as any);
			vi.mocked(fg.globSync).mockReturnValue([
				"/path/to/packages/test/tsconfig.json",
			]);

			await expect(
				command.handler({ pkg: "/path/to/package.json", fix: false }),
			).rejects.toThrow("does not include ts files");
		});

		it("should throw error when tsconfig missing tsx files include", async () => {
			const command = buildTsconfigIncludesCommand();
			const pkgJson = {
				workspaces: ["packages/*"],
			};
			const tsconfig = {
				include: ["src/**/*.ts", "src/**/*.json", "src/**/*.d.ts"],
			};

			vi.mocked(fs.readFileSync)
				.mockReturnValueOnce(JSON.stringify(pkgJson) as any)
				.mockReturnValueOnce(JSON.stringify(tsconfig) as any);
			vi.mocked(fg.globSync).mockReturnValue([
				"/path/to/packages/test/tsconfig.json",
			]);

			await expect(
				command.handler({ pkg: "/path/to/package.json", fix: false }),
			).rejects.toThrow("does not include tsx files");
		});

		it("should throw error when tsconfig missing json files include", async () => {
			const command = buildTsconfigIncludesCommand();
			const pkgJson = {
				workspaces: ["packages/*"],
			};
			const tsconfig = {
				include: ["src/**/*.ts", "src/**/*.tsx", "src/**/*.d.ts"],
			};

			vi.mocked(fs.readFileSync)
				.mockReturnValueOnce(JSON.stringify(pkgJson) as any)
				.mockReturnValueOnce(JSON.stringify(tsconfig) as any);
			vi.mocked(fg.globSync).mockReturnValue([
				"/path/to/packages/test/tsconfig.json",
			]);

			await expect(
				command.handler({ pkg: "/path/to/package.json", fix: false }),
			).rejects.toThrow("does not include json files");
		});

		it("should throw error when tsconfig missing d.ts files include", async () => {
			const command = buildTsconfigIncludesCommand();
			const pkgJson = {
				workspaces: ["packages/*"],
			};
			const tsconfig = {
				include: ["src/**/*.ts", "src/**/*.tsx", "src/**/*.json"],
			};

			vi.mocked(fs.readFileSync)
				.mockReturnValueOnce(JSON.stringify(pkgJson) as any)
				.mockReturnValueOnce(JSON.stringify(tsconfig) as any);
			vi.mocked(fg.globSync).mockReturnValue([
				"/path/to/packages/test/tsconfig.json",
			]);

			await expect(
				command.handler({ pkg: "/path/to/package.json", fix: false }),
			).rejects.toThrow("does not include d.ts files");
		});

		it("should fix missing includes when fix is true", async () => {
			const command = buildTsconfigIncludesCommand();
			const pkgJson = {
				workspaces: ["packages/*"],
			};
			const tsconfig = {
				include: ["src/**/*.ts"],
			};

			vi.mocked(fs.readFileSync)
				.mockReturnValueOnce(JSON.stringify(pkgJson) as any)
				.mockReturnValueOnce(JSON.stringify(tsconfig) as any);
			vi.mocked(fg.globSync).mockReturnValue([
				"/path/to/packages/test/tsconfig.json",
			]);

			await expect(
				command.handler({ pkg: "/path/to/package.json", fix: true }),
			).resolves.not.toThrow();
			expect(fs.writeFileSync).toHaveBeenCalled();
		});

		it("should throw error when include property is invalid", async () => {
			const command = buildTsconfigIncludesCommand();
			const pkgJson = {
				workspaces: ["packages/*"],
			};
			const tsconfig = {
				include: "invalid",
			};

			vi.mocked(fs.readFileSync)
				.mockReturnValueOnce(JSON.stringify(pkgJson) as any)
				.mockReturnValueOnce(JSON.stringify(tsconfig) as any);
			vi.mocked(fg.globSync).mockReturnValue([
				"/path/to/packages/test/tsconfig.json",
			]);

			await expect(
				command.handler({ pkg: "/path/to/package.json", fix: false }),
			).rejects.toThrow("has no/invalid include property");
		});

		it("should handle missing include property", async () => {
			const command = buildTsconfigIncludesCommand();
			const pkgJson = {
				workspaces: ["packages/*"],
			};
			const tsconfig = {};

			vi.mocked(fs.readFileSync)
				.mockReturnValueOnce(JSON.stringify(pkgJson) as any)
				.mockReturnValueOnce(JSON.stringify(tsconfig) as any);
			vi.mocked(fg.globSync).mockReturnValue([
				"/path/to/packages/test/tsconfig.json",
			]);

			await expect(
				command.handler({ pkg: "/path/to/package.json", fix: true }),
			).resolves.not.toThrow();
		});
	});
});
