import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

describe("Build Integration", () => {
	let testWorkspaceRoot: string;
	let externalPackageDir: string;
	let currentPackageDir: string;

	beforeEach(() => {
		// Create a temporary test workspace with two packages:
		// - external-pkg: contains files that should be watched and rebuilt
		// - current-pkg: the "current" package that should be excluded from watching
		testWorkspaceRoot = path.join(process.cwd(), "test-workspace");
		externalPackageDir = path.join(
			testWorkspaceRoot,
			"packages",
			"external-pkg",
		);
		currentPackageDir = path.join(testWorkspaceRoot, "packages", "current-pkg");

		// Create directory structure
		fs.mkdirSync(path.join(externalPackageDir, "src"), { recursive: true });
		fs.mkdirSync(path.join(currentPackageDir, "src"), { recursive: true });

		// Create package.json for workspace
		const workspacePkgJson = {
			name: "test-workspace",
			workspaces: ["packages/*"],
		};
		fs.writeFileSync(
			path.join(testWorkspaceRoot, "package.json"),
			JSON.stringify(workspacePkgJson, null, 2),
		);

		// Create tsconfig.json for the external package
		const tsconfig = {
			compilerOptions: {
				rootDir: "src",
				outDir: "dist",
				target: "ES2020",
				module: "ESNext",
			},
		};
		fs.writeFileSync(
			path.join(externalPackageDir, "tsconfig.json"),
			JSON.stringify(tsconfig, null, 2),
		);

		// Create tsconfig.json for the current package
		fs.writeFileSync(
			path.join(currentPackageDir, "tsconfig.json"),
			JSON.stringify(tsconfig, null, 2),
		);
	});

	afterEach(() => {
		// Clean up test workspace
		if (fs.existsSync(testWorkspaceRoot)) {
			// Use a more robust cleanup
			try {
				fs.rmSync(testWorkspaceRoot, { recursive: true, force: true });
			} catch (error) {
				// If it fails, try again after a brief delay
				setTimeout(() => {
					try {
						fs.rmSync(testWorkspaceRoot, { recursive: true, force: true });
					} catch (e) {
						console.warn("Failed to clean up test workspace:", e);
					}
				}, 100);
			}
		}
	});

	it("should build TypeScript file to ESM format", async () => {
		// Create a test TypeScript file in the external package
		const testFileContent = `
export function testFunction(): string {
	return "test output";
}

export interface TestInterface {
	value: string;
}
		`.trim();
		const testFile = path.join(externalPackageDir, "src", "test.ts");
		fs.writeFileSync(testFile, testFileContent);

		// Initialize plugin - current package is different from the one containing the file
		const config = {
			workspaceRoot: testWorkspaceRoot,
			currentPackage: "packages/current-pkg",
			format: "esm" as const,
		};

		const plugin = await VitePluginWatchWorkspace(config);

		// Mock Vite server for testing
		const mockServer = {
			ws: {
				send: vi.fn(),
			},
		};

		// Trigger hot update
		await plugin.handleHotUpdate?.({
			file: testFile,
			server: mockServer,
		} as any);

		// Check that output file was created in the external package's dist directory
		const outputFile = path.join(externalPackageDir, "dist", "test.js");
		expect(fs.existsSync(outputFile)).toBe(true);

		const outputContent = fs.readFileSync(outputFile, "utf8");
		expect(outputContent).toContain("testFunction");
		expect(outputContent).toContain("test output");
		expect(outputContent).toContain("export"); // ESM format
	});

	it("should build TypeScript file to CJS format", async () => {
		// Create a test TypeScript file in the external package
		const testFileContent = `
export function testFunction(): string {
	return "test output";
}
		`.trim();
		const testFile = path.join(externalPackageDir, "src", "test.ts");
		fs.writeFileSync(testFile, testFileContent);

		// Initialize plugin with CJS format
		const config = {
			workspaceRoot: testWorkspaceRoot,
			currentPackage: "packages/current-pkg",
			format: "cjs" as const,
		};

		const plugin = await VitePluginWatchWorkspace(config);

		// Mock Vite server for testing
		const mockServer = {
			ws: {
				send: vi.fn(),
			},
		};

		// Trigger hot update
		await plugin.handleHotUpdate?.({
			file: testFile,
			server: mockServer,
		} as any);

		// Check that output file was created
		const outputFile = path.join(externalPackageDir, "dist", "test.js");
		expect(fs.existsSync(outputFile)).toBe(true);

		const outputContent = fs.readFileSync(outputFile, "utf8");
		expect(outputContent).toContain("testFunction");
		expect(outputContent).toContain("exports."); // CJS format
	});

	it("should handle TSX files", async () => {
		// Create a test TSX file in the external package
		const testFileContent = `
export function TestComponent(): JSX.Element {
	return <div>test component</div>;
}
		`.trim();
		const testFile = path.join(externalPackageDir, "src", "test.tsx");
		fs.writeFileSync(testFile, testFileContent);

		// Initialize plugin
		const config = {
			workspaceRoot: testWorkspaceRoot,
			currentPackage: "packages/current-pkg",
			format: "esm" as const,
			fileTypes: ["ts", "tsx"],
		};

		const plugin = await VitePluginWatchWorkspace(config);

		// Mock Vite server for testing
		const mockServer = {
			ws: {
				send: vi.fn(),
			},
		};

		// Trigger hot update
		await plugin.handleHotUpdate?.({
			file: testFile,
			server: mockServer,
		} as any);

		// Check that output file was created
		const outputFile = path.join(externalPackageDir, "dist", "test.js");
		expect(fs.existsSync(outputFile)).toBe(true);

		const outputContent = fs.readFileSync(outputFile, "utf8");
		expect(outputContent).toContain("TestComponent");
		expect(outputContent).toContain("test component");
	});

	it("should send hot reload signal after successful build", async () => {
		// Create a test TypeScript file in the external package
		const testFileContent = `
export function testFunction(): string {
	return "test";
}
		`.trim();
		const testFile = path.join(externalPackageDir, "src", "test.ts");
		fs.writeFileSync(testFile, testFileContent);

		// Initialize plugin
		const config = {
			workspaceRoot: testWorkspaceRoot,
			currentPackage: "packages/current-pkg",
			format: "esm" as const,
		};

		const plugin = await VitePluginWatchWorkspace(config);

		// Mock Vite server for testing
		const mockSend = vi.fn();
		const mockServer = {
			ws: {
				send: mockSend,
			},
		};

		// Trigger hot update
		await plugin.handleHotUpdate?.({
			file: testFile,
			server: mockServer,
		} as any);

		// Verify hot reload signal was sent
		expect(mockSend).toHaveBeenCalledTimes(1);
		expect(mockSend).toHaveBeenCalledWith({
			type: "update",
			updates: [
				{
					acceptedPath: testFile,
					type: "js-update",
					path: testFile,
					timestamp: expect.any(Number),
				},
			],
		});
	});

	it("should handle files outside watched packages gracefully", async () => {
		// Create a file outside the watched packages
		const externalFile = path.join(testWorkspaceRoot, "external.ts");
		const externalContent = `
export function externalFunction(): string {
	return "external";
}
		`.trim();
		fs.writeFileSync(externalFile, externalContent);

		// Initialize plugin
		const config = {
			workspaceRoot: testWorkspaceRoot,
			currentPackage: "packages/current-pkg",
			format: "esm" as const,
		};

		const plugin = await VitePluginWatchWorkspace(config);

		// Mock Vite server for testing
		const mockSend = vi.fn();
		const mockServer = {
			ws: {
				send: mockSend,
			},
		};

		// Trigger hot update for external file
		await plugin.handleHotUpdate?.({
			file: externalFile,
			server: mockServer,
		} as any);

		// Should not send any hot reload signal for unwatched files
		expect(mockSend).not.toHaveBeenCalled();
	});

	it("should handle build errors gracefully", async () => {
		// Create a TypeScript file with syntax error in the external package
		const testFileContent = `
export function testFunction(): string {
	// Missing closing brace and return statement
	return "test";
`.trim();
		const testFile = path.join(externalPackageDir, "src", "test.ts");
		fs.writeFileSync(testFile, testFileContent);

		// Initialize plugin
		const config = {
			workspaceRoot: testWorkspaceRoot,
			currentPackage: "packages/current-pkg",
			format: "esm" as const,
		};

		const plugin = await VitePluginWatchWorkspace(config);

		// Mock Vite server for testing
		const mockSend = vi.fn();
		const mockServer = {
			ws: {
				send: mockSend,
			},
		};

		// Trigger hot update - should not throw
		await expect(
			plugin.handleHotUpdate?.({
				file: testFile,
				server: mockServer,
			} as Parameters<NonNullable<typeof plugin.handleHotUpdate>>[0]),
		).resolves.not.toThrow();

		// Should still send hot reload signal even with build errors
		expect(mockSend).toHaveBeenCalledTimes(1);
	});
});
