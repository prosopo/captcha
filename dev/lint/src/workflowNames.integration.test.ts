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
import { buildWorkflowNamesCommand } from "./workflowNames.js";

describe("workflowNames integration", () => {
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

	describe("workflowNames command", () => {
		it("should pass when workflow name matches filename", async () => {
			// Create .github/workflows directory
			const workflowsDir = path.join(tempDir, ".github", "workflows");
			fs.mkdirSync(workflowsDir, { recursive: true });

			// Create a workflow file with matching name
			const workflowPath = path.join(workflowsDir, "test-workflow.yml");
			const workflowContent = "name: test-workflow\non: push\njobs:\n  test:\n    runs-on: ubuntu-latest\n";
			fs.writeFileSync(workflowPath, workflowContent);

			const command = buildWorkflowNamesCommand();

			// Should not throw
			await expect(
				command.handler({ root: tempDir }),
			).resolves.not.toThrow();
		});

		it("should throw error when workflow name does not match filename", async () => {
			// Create .github/workflows directory
			const workflowsDir = path.join(tempDir, ".github", "workflows");
			fs.mkdirSync(workflowsDir, { recursive: true });

			// Create a workflow file with non-matching name
			const workflowPath = path.join(workflowsDir, "test-workflow.yml");
			const workflowContent = "name: different-name\non: push\njobs:\n  test:\n    runs-on: ubuntu-latest\n";
			fs.writeFileSync(workflowPath, workflowContent);

			const command = buildWorkflowNamesCommand();

			await expect(
				command.handler({ root: tempDir }),
			).rejects.toThrow("has name");
		});

		it("should throw error when no name found in workflow", async () => {
			// Create .github/workflows directory
			const workflowsDir = path.join(tempDir, ".github", "workflows");
			fs.mkdirSync(workflowsDir, { recursive: true });

			// Create a workflow file without name
			const workflowPath = path.join(workflowsDir, "test-workflow.yml");
			const workflowContent = "on: push\njobs:\n  test:\n    runs-on: ubuntu-latest\n";
			fs.writeFileSync(workflowPath, workflowContent);

			const command = buildWorkflowNamesCommand();

			await expect(
				command.handler({ root: tempDir }),
			).rejects.toThrow("No name found in workflow file");
		});

		it("should handle yaml extension", async () => {
			// Create .github/workflows directory
			const workflowsDir = path.join(tempDir, ".github", "workflows");
			fs.mkdirSync(workflowsDir, { recursive: true });

			// Create a .yaml workflow file
			// Note: The code uses path.basename(pth, ".yml") which only removes .yml, not .yaml
			// So for .yaml files, the name must include the .yaml extension
			const workflowPath = path.join(workflowsDir, "test-workflow.yaml");
			const workflowContent = "name: test-workflow.yaml\non: push\njobs:\n  test:\n    runs-on: ubuntu-latest\n";
			fs.writeFileSync(workflowPath, workflowContent);

			const command = buildWorkflowNamesCommand();

			// Should not throw
			await expect(
				command.handler({ root: tempDir }),
			).resolves.not.toThrow();
		});

		it("should handle multiple workflow files", async () => {
			// Create .github/workflows directory
			const workflowsDir = path.join(tempDir, ".github", "workflows");
			fs.mkdirSync(workflowsDir, { recursive: true });

			// Create first workflow file
			const workflow1Path = path.join(workflowsDir, "workflow1.yml");
			const workflow1Content = "name: workflow1\non: push\njobs:\n  test:\n    runs-on: ubuntu-latest\n";
			fs.writeFileSync(workflow1Path, workflow1Content);

			// Create second workflow file
			const workflow2Path = path.join(workflowsDir, "workflow2.yml");
			const workflow2Content = "name: workflow2\non: pull_request\njobs:\n  build:\n    runs-on: ubuntu-latest\n";
			fs.writeFileSync(workflow2Path, workflow2Content);

			const command = buildWorkflowNamesCommand();

			// Should not throw
			await expect(
				command.handler({ root: tempDir }),
			).resolves.not.toThrow();
		});

		it("should handle name with whitespace", async () => {
			// Create .github/workflows directory
			const workflowsDir = path.join(tempDir, ".github", "workflows");
			fs.mkdirSync(workflowsDir, { recursive: true });

			// Create a workflow file with name containing trailing whitespace
			const workflowPath = path.join(workflowsDir, "test-workflow.yml");
			const workflowContent = "name: test-workflow  \non: push\njobs:\n  test:\n    runs-on: ubuntu-latest\n";
			fs.writeFileSync(workflowPath, workflowContent);

			const command = buildWorkflowNamesCommand();

			// Should not throw
			await expect(
				command.handler({ root: tempDir }),
			).resolves.not.toThrow();
		});
	});
});