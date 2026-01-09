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

import fs from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import webpackConfig from "./webpack.config.js";

vi.mock("node:fs");

describe("webpackConfig", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return webpack config for production mode", () => {
		vi.spyOn(fs, "existsSync").mockReturnValue(true);

		const config = webpackConfig("production");

		expect(config).toBeDefined();
		expect(config.optimization?.minimize).toBe(true);
		expect(config.optimization?.minimizer).toBeDefined();
		expect(Array.isArray(config.optimization?.minimizer)).toBe(true);
		expect(
			(config.optimization?.minimizer as unknown[]).length,
		).toBeGreaterThan(0);
	});

	it("should return webpack config for development mode", () => {
		vi.spyOn(fs, "existsSync").mockReturnValue(true);

		const config = webpackConfig("development");

		expect(config).toBeDefined();
		expect(config.optimization?.minimize).toBe(false);
		expect(config.optimization?.minimizer).toBeDefined();
		expect(Array.isArray(config.optimization?.minimizer)).toBe(true);
		expect((config.optimization?.minimizer as unknown[]).length).toBe(0);
	});

	it("should use index.tsx as entry when it exists", () => {
		vi.spyOn(fs, "existsSync").mockImplementation((path: string) => {
			return path.includes("index.tsx");
		});

		const config = webpackConfig("production");

		expect(config.entry).toBe("./src/index.tsx");
	});

	it("should use index.ts as entry when index.tsx doesn't exist", () => {
		vi.spyOn(fs, "existsSync").mockImplementation((path: string) => {
			return path.includes("index.ts") && !path.includes("index.tsx");
		});

		const config = webpackConfig("production");

		expect(config.entry).toBe("./src/index.ts");
	});

	it("should default to index.tsx when neither file exists", () => {
		vi.spyOn(fs, "existsSync").mockReturnValue(false);

		const config = webpackConfig("production");

		expect(config.entry).toBe("./src/index.tsx");
	});

	it("should have correct resolve configuration", () => {
		vi.spyOn(fs, "existsSync").mockReturnValue(true);

		const config = webpackConfig("production");

		expect(config.resolve).toBeDefined();
		expect(config.resolve?.extensions).toContain(".js");
		expect(config.resolve?.extensions).toContain(".ts");
		expect(config.resolve?.extensions).toContain(".tsx");
		expect(config.resolve?.fullySpecified).toBe(false);
	});

	it("should have correct output configuration", () => {
		vi.spyOn(fs, "existsSync").mockReturnValue(true);

		const config = webpackConfig("production");

		expect(config.output).toBeDefined();
		expect(config.output?.filename).toBe("react_app.[name].bundle.js");
		expect(config.output?.path).toBeDefined();
		expect(config.output?.publicPath).toBe("/");
	});

	it("should have module rules configured", () => {
		vi.spyOn(fs, "existsSync").mockReturnValue(true);

		const config = webpackConfig("production");

		expect(config.module).toBeDefined();
		expect(config.module?.rules).toBeDefined();
		expect(Array.isArray(config.module?.rules)).toBe(true);
		expect((config.module?.rules as unknown[]).length).toBeGreaterThan(0);
	});

	it("should have plugins configured", () => {
		vi.spyOn(fs, "existsSync").mockReturnValue(true);

		const config = webpackConfig("production");

		expect(config.plugins).toBeDefined();
		expect(Array.isArray(config.plugins)).toBe(true);
		expect((config.plugins as unknown[]).length).toBeGreaterThan(0);
	});

	it("should have externals configured", () => {
		vi.spyOn(fs, "existsSync").mockReturnValue(true);

		const config = webpackConfig("production");

		expect(config.externals).toBeDefined();
		expect(config.externals).toHaveProperty("node:url");
		expect(config.externals).toHaveProperty("node:path");
		expect(config.externals).toHaveProperty("node:fs");
	});

	it("should have optimization configured", () => {
		vi.spyOn(fs, "existsSync").mockReturnValue(true);

		const config = webpackConfig("production");

		expect(config.optimization).toBeDefined();
		expect(config.optimization?.noEmitOnErrors).toBe(true);
		expect(config.optimization?.usedExports).toBe(true);
	});
});
