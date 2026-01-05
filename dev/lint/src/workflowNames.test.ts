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
import { buildWorkflowNamesCommand } from "./workflowNames.js";

vi.mock("node:fs");
vi.mock("fast-glob");

describe("workflowNames", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("buildWorkflowNamesCommand", () => {
		it("should return command configuration with correct structure", () => {
			const command = buildWorkflowNamesCommand();
			expect(command.command).toBe("workflowNames");
			expect(command.describe).toBe(
				"Check the workflow names in the workspace",
			);
			expect(command.builder).toBeDefined();
			expect(command.handler).toBeDefined();
		});

		it("should configure yargs with root option", () => {
			const command = buildWorkflowNamesCommand();
			const yargsMock = {
				option: vi.fn().mockReturnThis(),
			};
			command.builder(yargsMock as any);
			expect(yargsMock.option).toHaveBeenCalledWith("root", {
				alias: "r",
			});
		});
	});

	describe("workflowNames handler", () => {
		it("should pass when workflow name matches filename", async () => {
			const command = buildWorkflowNamesCommand();
			const workflowContent = "name: test-workflow\n";

			vi.mocked(fg.globSync).mockReturnValue([
				"/path/to/.github/workflows/test-workflow.yml",
			]);
			vi.mocked(fs.readFileSync).mockReturnValue(workflowContent as any);

			await expect(
				command.handler({ root: "/path/to" }),
			).resolves.not.toThrow();
		});

		it("should throw error when workflow name does not match filename", async () => {
			const command = buildWorkflowNamesCommand();
			const workflowContent = "name: different-name\n";

			vi.mocked(fg.globSync).mockReturnValue([
				"/path/to/.github/workflows/test-workflow.yml",
			]);
			vi.mocked(fs.readFileSync).mockReturnValue(workflowContent as any);

			await expect(command.handler({ root: "/path/to" })).rejects.toThrow(
				"has name",
			);
		});

		it("should throw error when no name found in workflow", async () => {
			const command = buildWorkflowNamesCommand();
			const workflowContent = "on: push\n";

			vi.mocked(fg.globSync).mockReturnValue([
				"/path/to/.github/workflows/test-workflow.yml",
			]);
			vi.mocked(fs.readFileSync).mockReturnValue(workflowContent as any);

			await expect(command.handler({ root: "/path/to" })).rejects.toThrow(
				"No name found in workflow file",
			);
		});

		it("should handle yaml extension", async () => {
			const command = buildWorkflowNamesCommand();
			// Note: The code uses path.basename(pth, ".yml") which only removes .yml, not .yaml
			// So for .yaml files, the name must include the .yaml extension
			const workflowContent = "name: test-workflow.yaml\n";

			vi.mocked(fg.globSync).mockReturnValue([
				"/path/to/.github/workflows/test-workflow.yaml",
			]);
			vi.mocked(fs.readFileSync).mockReturnValue(workflowContent as any);

			await expect(
				command.handler({ root: "/path/to" }),
			).resolves.not.toThrow();
		});

		it("should handle multiple workflow files", async () => {
			const command = buildWorkflowNamesCommand();
			const workflowContent1 = "name: workflow1\n";
			const workflowContent2 = "name: workflow2\n";

			vi.mocked(fg.globSync).mockReturnValue([
				"/path/to/.github/workflows/workflow1.yml",
				"/path/to/.github/workflows/workflow2.yml",
			]);
			vi.mocked(fs.readFileSync)
				.mockReturnValueOnce(workflowContent1 as any)
				.mockReturnValueOnce(workflowContent2 as any);

			await expect(
				command.handler({ root: "/path/to" }),
			).resolves.not.toThrow();
		});

		it("should handle name with whitespace", async () => {
			const command = buildWorkflowNamesCommand();
			const workflowContent = "name: test-workflow  \n";

			vi.mocked(fg.globSync).mockReturnValue([
				"/path/to/.github/workflows/test-workflow.yml",
			]);
			vi.mocked(fs.readFileSync).mockReturnValue(workflowContent as any);

			await expect(
				command.handler({ root: "/path/to" }),
			).resolves.not.toThrow();
		});
	});
});
