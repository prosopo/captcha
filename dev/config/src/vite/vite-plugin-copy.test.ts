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
import fg from "fast-glob";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VitePluginCopy from "./vite-plugin-copy.js";

vi.mock("node:fs");
vi.mock("fast-glob");

describe("VitePluginCopy", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return a plugin with correct name", () => {
		const plugin = VitePluginCopy({
			srcDir: "./src",
			destDir: "./dist",
			include: ["**/*.json"],
		});

		expect(plugin.name).toBe("copy-plugin");
	});

	it("should return early when no include patterns are specified", async () => {
		const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => {});
		const plugin = VitePluginCopy({
			srcDir: "./src",
			destDir: "./dist",
		});

		await plugin.closeBundle?.();

		expect(consoleSpy).toHaveBeenCalledWith(
			"[copy-plugin] No include globs specified, nothing to copy.",
		);
		consoleSpy.mockRestore();
	});

	it("should copy files matching include patterns", async () => {
		const mockFiles = ["file1.json", "file2.json"];
		vi.mocked(fg).mockResolvedValue(mockFiles);
		vi.spyOn(fs, "existsSync").mockReturnValue(true);
		vi.spyOn(fs, "mkdirSync").mockImplementation(() => {});
		vi.spyOn(fs, "copyFileSync").mockImplementation(() => {});
		const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => {});

		const plugin = VitePluginCopy({
			srcDir: "./src",
			destDir: "./dist",
			include: ["**/*.json"],
		});

		await plugin.closeBundle?.();

		expect(fg).toHaveBeenCalledWith(
			["**/*.json"],
			expect.objectContaining({
				cwd: expect.any(String),
				ignore: [],
				onlyFiles: true,
				absolute: false,
			}),
		);
		expect(fs.copyFileSync).toHaveBeenCalledTimes(2);
		consoleSpy.mockRestore();
	});

	it("should exclude files matching exclude patterns", async () => {
		const mockFiles = ["file1.json"];
		vi.mocked(fg).mockResolvedValue(mockFiles);
		vi.spyOn(fs, "existsSync").mockReturnValue(true);
		vi.spyOn(fs, "mkdirSync").mockImplementation(() => {});
		vi.spyOn(fs, "copyFileSync").mockImplementation(() => {});

		const plugin = VitePluginCopy({
			srcDir: "./src",
			destDir: "./dist",
			include: ["**/*.json"],
			exclude: ["**/excluded/**"],
		});

		await plugin.closeBundle?.();

		expect(fg).toHaveBeenCalledWith(
			["**/*.json"],
			expect.objectContaining({
				ignore: ["**/excluded/**"],
			}),
		);
	});

	it("should create destination directory if it doesn't exist", async () => {
		const mockFiles = ["subdir/file.json"];
		vi.mocked(fg).mockResolvedValue(mockFiles);
		vi.spyOn(fs, "existsSync").mockReturnValue(false);
		const mkdirSyncSpy = vi.spyOn(fs, "mkdirSync").mockImplementation(() => {});
		vi.spyOn(fs, "copyFileSync").mockImplementation(() => {});

		const plugin = VitePluginCopy({
			srcDir: "./src",
			destDir: "./dist",
			include: ["**/*.json"],
		});

		await plugin.closeBundle?.();

		expect(mkdirSyncSpy).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ recursive: true }),
		);
	});

	it("should handle empty exclude array", async () => {
		const mockFiles = ["file1.json"];
		vi.mocked(fg).mockResolvedValue(mockFiles);
		vi.spyOn(fs, "existsSync").mockReturnValue(true);
		vi.spyOn(fs, "mkdirSync").mockImplementation(() => {});
		vi.spyOn(fs, "copyFileSync").mockImplementation(() => {});

		const plugin = VitePluginCopy({
			srcDir: "./src",
			destDir: "./dist",
			include: ["**/*.json"],
			exclude: [],
		});

		await plugin.closeBundle?.();

		expect(fg).toHaveBeenCalledWith(
			["**/*.json"],
			expect.objectContaining({
				ignore: [],
			}),
		);
	});

	it("should handle multiple include patterns", async () => {
		const mockFiles = ["file1.json", "file2.txt"];
		vi.mocked(fg).mockResolvedValue(mockFiles);
		vi.spyOn(fs, "existsSync").mockReturnValue(true);
		vi.spyOn(fs, "mkdirSync").mockImplementation(() => {});
		vi.spyOn(fs, "copyFileSync").mockImplementation(() => {});

		const plugin = VitePluginCopy({
			srcDir: "./src",
			destDir: "./dist",
			include: ["**/*.json", "**/*.txt"],
		});

		await plugin.closeBundle?.();

		expect(fg).toHaveBeenCalledWith(
			["**/*.json", "**/*.txt"],
			expect.any(Object),
		);
	});

	it("should handle no files found", async () => {
		vi.mocked(fg).mockResolvedValue([]);
		vi.spyOn(fs, "existsSync").mockReturnValue(true);

		const plugin = VitePluginCopy({
			srcDir: "./src",
			destDir: "./dist",
			include: ["**/*.json"],
		});

		await plugin.closeBundle?.();

		expect(fs.copyFileSync).not.toHaveBeenCalled();
	});
});
