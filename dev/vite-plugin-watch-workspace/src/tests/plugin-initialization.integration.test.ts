import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
// Copyright 2021-2026 Prosopo (UK) Ltd.
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

import { VitePluginWatchWorkspace } from "../vite-plugin-watch-workspace.js";

describe("VitePluginWatchWorkspace - Plugin Initialization", () => {
	let testWorkspaceRoot: string;
	let testPackageDir: string;

	beforeEach(() => {
		// Create a temporary test workspace
		testWorkspaceRoot = path.join(process.cwd(), "test-workspace");
		testPackageDir = path.join(testWorkspaceRoot, "packages", "test-pkg");

		// Create directory structure
		fs.mkdirSync(path.join(testPackageDir, "src"), { recursive: true });

		// Create package.json for workspace
		const workspacePkgJson = {
			name: "test-workspace",
			workspaces: ["packages/*"],
		};
		fs.writeFileSync(
			path.join(testWorkspaceRoot, "package.json"),
			JSON.stringify(workspacePkgJson, null, 2),
		);

		// Create tsconfig.json for the test package
		const tsconfig = {
			compilerOptions: {
				rootDir: "src",
				outDir: "dist",
			},
		};
		fs.writeFileSync(
			path.join(testPackageDir, "tsconfig.json"),
			JSON.stringify(tsconfig, null, 2),
		);

		// Create a test TypeScript file
		const testFile = `
export function testFunction(): string {
	return "test";
}
		`.trim();
		fs.writeFileSync(path.join(testPackageDir, "src", "test.ts"), testFile);
	});

	afterEach(() => {
		// Clean up test workspace
		if (fs.existsSync(testWorkspaceRoot)) {
			fs.rmSync(testWorkspaceRoot, { recursive: true, force: true });
		}
	});

	it("should initialize plugin with ESM format", async () => {
		// Test that the plugin can be initialized with basic configuration
		const config = {
			workspaceRoot: testWorkspaceRoot,
			currentPackage: "packages/test-pkg",
			format: "esm" as const,
		};

		const plugin = await VitePluginWatchWorkspace(config);

		// Verify plugin structure
		expect(plugin).toBeDefined();
		expect(typeof plugin).toBe("object");
		expect(plugin.name).toBe("vite-plugin-watch-workspace");
		expect(typeof plugin.buildStart).toBe("function");
		expect(typeof plugin.handleHotUpdate).toBe("function");
	});

	it("should initialize plugin with CJS format", async () => {
		// Test that the plugin can be initialized with CJS format
		const config = {
			workspaceRoot: testWorkspaceRoot,
			currentPackage: "packages/test-pkg",
			format: "cjs" as const,
		};

		const plugin = await VitePluginWatchWorkspace(config);

		expect(plugin).toBeDefined();
		expect(plugin.name).toBe("vite-plugin-watch-workspace");
	});

	it("should initialize plugin with custom file types", async () => {
		// Test that the plugin accepts custom file types
		const config = {
			workspaceRoot: testWorkspaceRoot,
			currentPackage: "packages/test-pkg",
			format: "esm" as const,
			fileTypes: ["ts", "tsx", "js"],
		};

		const plugin = await VitePluginWatchWorkspace(config);

		expect(plugin).toBeDefined();
		expect(plugin.name).toBe("vite-plugin-watch-workspace");
	});

	it("should initialize plugin with ignore patterns", async () => {
		// Test that the plugin accepts ignore patterns
		const config = {
			workspaceRoot: testWorkspaceRoot,
			currentPackage: "packages/test-pkg",
			format: "esm" as const,
			ignorePaths: ["**/node_modules/**", "**/dist/**"],
		};

		const plugin = await VitePluginWatchWorkspace(config);

		expect(plugin).toBeDefined();
		expect(plugin.name).toBe("vite-plugin-watch-workspace");
	});

	it("should initialize plugin with glob pattern for currentPackage", async () => {
		// Test that the plugin works with glob patterns
		const config = {
			workspaceRoot: testWorkspaceRoot,
			currentPackage: "packages/*",
			format: "esm" as const,
		};

		const plugin = await VitePluginWatchWorkspace(config);

		expect(plugin).toBeDefined();
		expect(plugin.name).toBe("vite-plugin-watch-workspace");
	});

	it("should throw error for invalid workspace root", async () => {
		// Test error handling for invalid workspace root
		const config = {
			workspaceRoot: "/nonexistent/path",
			currentPackage: "packages/test-pkg",
			format: "esm" as const,
		};

		await expect(VitePluginWatchWorkspace(config)).rejects.toThrow();
	});
});
