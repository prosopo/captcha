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

import { builtinModules } from "node:module";
import { describe, expect, it } from "vitest";
import VitePluginFixAbsoluteImports from "./vite-plugin-fix-absolute-imports.js";

describe("VitePluginFixAbsoluteImports", () => {
	it("should return a plugin with correct name", () => {
		const plugin = VitePluginFixAbsoluteImports();

		expect(plugin.name).toBe("fix-absolute-imports");
		expect(plugin.enforce).toBe("post");
	});

	it("should fix absolute imports for builtin modules", () => {
		const plugin = VitePluginFixAbsoluteImports();
		const testModule = builtinModules[0];
		const code = `import something from "${testModule}/some/path/file.js";`;
		const id = "test-file.ts";

		const result = plugin.transform?.(code, id);

		expect(result).toBeDefined();
		if (result && typeof result === "object" && "code" in result) {
			expect(result.code).toBe(`import something from "${testModule}";`);
		}
	});

	it("should not modify non-builtin module imports", () => {
		const plugin = VitePluginFixAbsoluteImports();
		const code = `import something from "some-package/file.js";`;
		const id = "test-file.ts";

		const result = plugin.transform?.(code, id);

		expect(result).toBeDefined();
		if (result && typeof result === "object" && "code" in result) {
			expect(result.code).toBe(code);
		}
	});

	it("should handle multiple absolute imports in same file", () => {
		const plugin = VitePluginFixAbsoluteImports();
		const testModule = builtinModules[0];
		const code = `import a from "${testModule}/path1.js";\nimport b from "${testModule}/path2.js";`;
		const id = "test-file.ts";

		const result = plugin.transform?.(code, id);

		expect(result).toBeDefined();
		if (result && typeof result === "object" && "code" in result) {
			expect(result.code).toContain(`from "${testModule}";`);
			expect(result.code.split(`from "${testModule}";`).length).toBe(3);
		}
	});

	it("should not modify imports without .js extension", () => {
		const plugin = VitePluginFixAbsoluteImports();
		const testModule = builtinModules[0];
		const code = `import something from "${testModule}/some/path/file";`;
		const id = "test-file.ts";

		const result = plugin.transform?.(code, id);

		expect(result).toBeDefined();
		if (result && typeof result === "object" && "code" in result) {
			expect(result.code).toBe(code);
		}
	});

	it("should handle code with no imports", () => {
		const plugin = VitePluginFixAbsoluteImports();
		const code = "const x = 1;";
		const id = "test-file.ts";

		const result = plugin.transform?.(code, id);

		expect(result).toBeDefined();
		if (result && typeof result === "object" && "code" in result) {
			expect(result.code).toBe(code);
		}
	});

	it("should handle empty code", () => {
		const plugin = VitePluginFixAbsoluteImports();
		const code = "";
		const id = "test-file.ts";

		const result = plugin.transform?.(code, id);

		expect(result).toBeDefined();
		if (result && typeof result === "object" && "code" in result) {
			expect(result.code).toBe("");
		}
	});
});
