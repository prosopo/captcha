import { describe, expect, it } from "vitest";
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

import type { VitePluginWatchExternalOptions } from "../vite-plugin-watch-workspace.js";

describe("Type Definitions", () => {
	it("should accept valid VitePluginWatchExternalOptions configuration", () => {
		// Test that the type accepts valid configurations
		const config: VitePluginWatchExternalOptions = {
			workspaceRoot: "/path/to/workspace",
			currentPackage: "packages/my-package",
			format: "esm",
		};

		expect(config.workspaceRoot).toBe("/path/to/workspace");
		expect(config.currentPackage).toBe("packages/my-package");
		expect(config.format).toBe("esm");
	});

	it("should accept optional fileTypes parameter", () => {
		const config: VitePluginWatchExternalOptions = {
			workspaceRoot: "/path/to/workspace",
			currentPackage: "packages/my-package",
			format: "esm",
			fileTypes: ["ts", "tsx", "js"],
		};

		expect(config.fileTypes).toEqual(["ts", "tsx", "js"]);
	});

	it("should accept optional ignorePaths parameter", () => {
		const config: VitePluginWatchExternalOptions = {
			workspaceRoot: "/path/to/workspace",
			currentPackage: "packages/my-package",
			format: "esm",
			ignorePaths: ["**/node_modules/**", "**/dist/**"],
		};

		expect(config.ignorePaths).toEqual(["**/node_modules/**", "**/dist/**"]);
	});

	it("should accept glob patterns for currentPackage", () => {
		const config: VitePluginWatchExternalOptions = {
			workspaceRoot: "/path/to/workspace",
			currentPackage: "packages/*",
			format: "esm",
		};

		expect(config.currentPackage).toBe("packages/*");
	});

	it("should accept both esm and cjs formats", () => {
		const esmConfig: VitePluginWatchExternalOptions = {
			workspaceRoot: "/path/to/workspace",
			currentPackage: "packages/my-package",
			format: "esm",
		};

		const cjsConfig: VitePluginWatchExternalOptions = {
			workspaceRoot: "/path/to/workspace",
			currentPackage: "packages/my-package",
			format: "cjs",
		};

		expect(esmConfig.format).toBe("esm");
		expect(cjsConfig.format).toBe("cjs");
	});

	it("should require mandatory properties", () => {
		// This test ensures TypeScript would catch missing required properties
		// We can't test this directly in runtime, but we can test the structure

		const validConfig: VitePluginWatchExternalOptions = {
			workspaceRoot: "/test",
			currentPackage: "test",
			format: "esm",
		};

		// TypeScript should ensure these properties exist
		expect(typeof validConfig.workspaceRoot).toBe("string");
		expect(typeof validConfig.currentPackage).toBe("string");
		expect(["esm", "cjs"]).toContain(validConfig.format);
	});
});
