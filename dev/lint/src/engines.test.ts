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
import { buildEnginesCommand } from "./engines.js";

vi.mock("node:fs");
vi.mock("fast-glob");

describe("engines", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("buildEnginesCommand", () => {
		it("should return command configuration with correct structure", () => {
			const command = buildEnginesCommand();
			expect(command.command).toBe("engines");
			expect(command.describe).toBe("Check the engines of the workspace");
			expect(command.builder).toBeDefined();
			expect(command.handler).toBeDefined();
		});

		it("should configure yargs with pkg option", () => {
			const command = buildEnginesCommand();
			const yargsMock = {
				option: vi.fn().mockReturnThis(),
			};
			command.builder(yargsMock as any);
			expect(yargsMock.option).toHaveBeenCalledWith("pkg", {
				alias: "p",
			});
		});
	});

	describe("engines handler", () => {
		it("should throw error when package.json is not a workspace", async () => {
			const command = buildEnginesCommand();
			const pkgJson = {};
			vi.mocked(fs.readFileSync).mockReturnValue(
				JSON.stringify(pkgJson) as any,
			);

			await expect(
				command.handler({ pkg: "/path/to/package.json" }),
			).rejects.toThrow("is not a workspace");
		});

		it("should throw error when engines are missing", async () => {
			const command = buildEnginesCommand();
			const pkgJson = {
				workspaces: ["packages/*"],
			};
			vi.mocked(fs.readFileSync).mockReturnValue(
				JSON.stringify(pkgJson) as any,
			);
			vi.mocked(fg.globSync).mockReturnValue([]);

			await expect(
				command.handler({ pkg: "/path/to/package.json" }),
			).rejects.toThrow();
		});

		it("should throw error when node version mismatch", async () => {
			const command = buildEnginesCommand();
			const workspacePkgJson = {
				workspaces: ["packages/*"],
				engines: {
					node: "^24",
					npm: "^11",
				},
			};
			const packagePkgJson = {
				engines: {
					node: "^20",
					npm: "^11",
				},
			};

			vi.mocked(fs.readFileSync)
				.mockReturnValueOnce(JSON.stringify(workspacePkgJson) as any)
				.mockReturnValueOnce(JSON.stringify(packagePkgJson) as any);
			vi.mocked(fg.globSync).mockReturnValue([
				"/path/to/packages/test/package.json",
			]);

			await expect(
				command.handler({ pkg: "/path/to/package.json" }),
			).rejects.toThrow("has node version");
		});

		it("should throw error when npm version mismatch", async () => {
			const command = buildEnginesCommand();
			const workspacePkgJson = {
				workspaces: ["packages/*"],
				engines: {
					node: "^24",
					npm: "^11",
				},
			};
			const packagePkgJson = {
				engines: {
					node: "^24",
					npm: "^10",
				},
			};

			vi.mocked(fs.readFileSync)
				.mockReturnValueOnce(JSON.stringify(workspacePkgJson) as any)
				.mockReturnValueOnce(JSON.stringify(packagePkgJson) as any);
			vi.mocked(fg.globSync).mockReturnValue([
				"/path/to/packages/test/package.json",
			]);

			await expect(
				command.handler({ pkg: "/path/to/package.json" }),
			).rejects.toThrow("has npm version");
		});

		it("should throw error when package engines are invalid", async () => {
			const command = buildEnginesCommand();
			const workspacePkgJson = {
				workspaces: ["packages/*"],
				engines: {
					node: "^24",
					npm: "^11",
				},
			};
			const packagePkgJson = {
				engines: {
					node: "^24",
				},
			};

			vi.mocked(fs.readFileSync)
				.mockReturnValueOnce(JSON.stringify(workspacePkgJson) as any)
				.mockReturnValueOnce(JSON.stringify(packagePkgJson) as any);
			vi.mocked(fg.globSync).mockReturnValue([
				"/path/to/packages/test/package.json",
			]);

			await expect(
				command.handler({ pkg: "/path/to/package.json" }),
			).rejects.toThrow("has invalid engines");
		});

		it("should pass when all engines match", async () => {
			const command = buildEnginesCommand();
			const workspacePkgJson = {
				workspaces: ["packages/*"],
				engines: {
					node: "^24",
					npm: "^11",
				},
			};
			const packagePkgJson = {
				engines: {
					node: "^24",
					npm: "^11",
				},
			};

			vi.mocked(fs.readFileSync)
				.mockReturnValueOnce(JSON.stringify(workspacePkgJson) as any)
				.mockReturnValueOnce(JSON.stringify(packagePkgJson) as any);
			vi.mocked(fg.globSync).mockReturnValue([
				"/path/to/packages/test/package.json",
			]);

			await expect(
				command.handler({ pkg: "/path/to/package.json" }),
			).resolves.not.toThrow();
		});

		it("should check multiple packages", async () => {
			const command = buildEnginesCommand();
			const workspacePkgJson = {
				workspaces: ["packages/*"],
				engines: {
					node: "^24",
					npm: "^11",
				},
			};
			const packagePkgJson = {
				engines: {
					node: "^24",
					npm: "^11",
				},
			};

			vi.mocked(fs.readFileSync)
				.mockReturnValueOnce(JSON.stringify(workspacePkgJson) as any)
				.mockReturnValueOnce(JSON.stringify(packagePkgJson) as any)
				.mockReturnValueOnce(JSON.stringify(packagePkgJson) as any);
			vi.mocked(fg.globSync).mockReturnValue([
				"/path/to/packages/test1/package.json",
				"/path/to/packages/test2/package.json",
			]);

			await expect(
				command.handler({ pkg: "/path/to/package.json" }),
			).resolves.not.toThrow();
			expect(fs.readFileSync).toHaveBeenCalledTimes(3);
		});
	});
});
