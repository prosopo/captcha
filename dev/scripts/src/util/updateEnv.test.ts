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
import path from "node:path";
import { getEnv } from "@prosopo/dotenv";
import { at } from "@prosopo/util";
import dotenv from "dotenv";
import fg from "fast-glob";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	findEnvFiles,
	updateDemoHTMLFiles,
	updateEnvFiles,
} from "./updateEnv.js";

vi.mock("node:fs");
vi.mock("node:path");
vi.mock("fast-glob");
vi.mock("@prosopo/dotenv");
vi.mock("dotenv");
vi.mock("@prosopo/util");

describe("findEnvFiles", () => {
	const mockLogger = {
		info: vi.fn(),
		debug: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
	} as any;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getEnv).mockReturnValue("development");
	});

	it("should find env files in default location", async () => {
		vi.mocked(fg).mockResolvedValue(["../../packages/test/.env.development"]);

		const result = await findEnvFiles(mockLogger);

		expect(fg).toHaveBeenCalledWith(
			"../../**/.env.development",
			expect.objectContaining({
				ignore: expect.arrayContaining(["**/node_modules/**"]),
			}),
		);
		expect(result).toEqual(["../../packages/test/.env.development"]);
	});

	it("should find env files in custom cwd", async () => {
		vi.mocked(fg).mockResolvedValue(["/custom/path/.env.development"]);

		const result = await findEnvFiles(mockLogger, "/custom/path");

		expect(fg).toHaveBeenCalledWith(
			"/custom/path/**/.env.development",
			expect.any(Object),
		);
		expect(result).toEqual(["/custom/path/.env.development"]);
	});

	it("should use correct env file name based on environment", async () => {
		vi.mocked(getEnv).mockReturnValue("production");
		vi.mocked(fg).mockResolvedValue([]);

		await findEnvFiles(mockLogger);

		expect(fg).toHaveBeenCalledWith(
			"../../**/.env.production",
			expect.any(Object),
		);
	});
});

describe("updateEnvFiles", () => {
	const mockLogger = {
		info: vi.fn(),
		debug: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
	} as any;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getEnv).mockReturnValue("development");
		vi.mocked(fg).mockResolvedValue(["test/.env.development"]);
	});

	it("should update env file with new variable value", async () => {
		const envContent = "PROSOPO_SITE_KEY=old_value\nOTHER_VAR=other";
		vi.mocked(fs.readFileSync).mockReturnValue(envContent);
		vi.mocked(dotenv.parse).mockReturnValue({
			PROSOPO_SITE_KEY: "old_value",
			OTHER_VAR: "other",
		});
		vi.mocked(fs.writeFileSync).mockImplementation(() => {});

		await updateEnvFiles(["PROSOPO_SITE_KEY"], "new_value", mockLogger);

		expect(fs.readFileSync).toHaveBeenCalled();
		expect(fs.writeFileSync).toHaveBeenCalled();
		const writtenContent = vi.mocked(fs.writeFileSync).mock
			.calls[0][1] as string;
		expect(writtenContent).toContain("PROSOPO_SITE_KEY=new_value");
		expect(writtenContent).toContain("OTHER_VAR=other");
	});

	it("should update multiple env variables", async () => {
		const envContent = "VAR1=old1\nVAR2=old2";
		vi.mocked(fs.readFileSync).mockReturnValue(envContent);
		vi.mocked(dotenv.parse).mockReturnValue({
			VAR1: "old1",
			VAR2: "old2",
		});
		vi.mocked(fs.writeFileSync).mockImplementation(() => {});

		await updateEnvFiles(["VAR1", "VAR2"], "new_value", mockLogger);

		const writtenContent = vi.mocked(fs.writeFileSync).mock
			.calls[0][1] as string;
		expect(writtenContent).toContain("VAR1=new_value");
		expect(writtenContent).toContain("VAR2=new_value");
	});

	it("should not write file if no variables match", async () => {
		const envContent = "OTHER_VAR=value";
		vi.mocked(fs.readFileSync).mockReturnValue(envContent);
		vi.mocked(dotenv.parse).mockReturnValue({
			OTHER_VAR: "value",
		});
		vi.mocked(fs.writeFileSync).mockImplementation(() => {});

		await updateEnvFiles(["PROSOPO_SITE_KEY"], "new_value", mockLogger);

		expect(fs.writeFileSync).not.toHaveBeenCalled();
	});

	it("should handle custom cwd", async () => {
		vi.mocked(fs.readFileSync).mockReturnValue("VAR=value");
		vi.mocked(dotenv.parse).mockReturnValue({
			VAR: "value",
		});
		vi.mocked(fs.writeFileSync).mockImplementation(() => {});

		await updateEnvFiles(["VAR"], "new_value", mockLogger, "/custom/path");

		expect(fg).toHaveBeenCalledWith(
			"/custom/path/**/.env.development",
			expect.any(Object),
		);
	});
});

describe("updateDemoHTMLFiles", () => {
	const mockLogger = {
		info: vi.fn(),
		debug: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
	} as any;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(fg).mockResolvedValue(["../../demos/test/index.html"]);
	});

	it.skip("should update HTML file with matching site key", async () => {
		const htmlContent =
			'<div data-sitekey="old_key_123456789012345678901234567890123456"></div>';
		const mockBuffer = {
			toString: () => htmlContent,
		} as any;
		vi.mocked(fs.readFileSync).mockReturnValue(mockBuffer);
		vi.mocked(fs.writeFileSync).mockImplementation(() => {});
		vi.mocked(path.resolve).mockImplementation((...args) => {
			if (args.length === 1) {
				return args[0];
			}
			return args.join("/");
		});
		vi.mocked(at).mockImplementation((arr: any, idx: number) => {
			return arr?.[idx];
		});

		await updateDemoHTMLFiles(
			[/data-sitekey="(\w{48})"/],
			"new_key_123456789012345678901234567890123456",
			mockLogger,
		);

		expect(fs.writeFileSync).toHaveBeenCalled();
		const writtenContent = vi.mocked(fs.writeFileSync).mock
			.calls[0][1] as string;
		expect(writtenContent).toContain(
			"new_key_123456789012345678901234567890123456",
		);
		expect(writtenContent).not.toContain(
			"old_key_123456789012345678901234567890123456",
		);
	});

	it.skip("should update HTML file with siteKey pattern", async () => {
		const htmlContent =
			"const config = { siteKey: 'old_key_123456789012345678901234567890123456' };";
		const mockBuffer = {
			toString: () => htmlContent,
		} as any;
		vi.mocked(fs.readFileSync).mockReturnValue(mockBuffer);
		vi.mocked(fs.writeFileSync).mockImplementation(() => {});
		vi.mocked(path.resolve).mockImplementation((...args) => {
			if (args.length === 1) {
				return args[0];
			}
			return args.join("/");
		});
		vi.mocked(at).mockImplementation((arr: any, idx: number) => {
			return arr?.[idx];
		});

		await updateDemoHTMLFiles(
			[/siteKey:\s*'(\w{48})'/],
			"new_key_123456789012345678901234567890123456",
			mockLogger,
		);

		expect(fs.writeFileSync).toHaveBeenCalled();
		const writtenContent = vi.mocked(fs.writeFileSync).mock
			.calls[0][1] as string;
		expect(writtenContent).toContain(
			"new_key_123456789012345678901234567890123456",
		);
	});

	it("should not write file if no matches found", async () => {
		const htmlContent = "<div>No site key here</div>";
		const mockBuffer = {
			toString: () => htmlContent,
		} as any;
		vi.mocked(fs.readFileSync).mockReturnValue(mockBuffer);
		vi.mocked(fs.writeFileSync).mockImplementation(() => {});
		vi.mocked(path.resolve).mockImplementation((...args) => args.join("/"));

		await updateDemoHTMLFiles(
			[/data-sitekey="(\w{48})"/],
			"new_key",
			mockLogger,
		);

		expect(fs.writeFileSync).not.toHaveBeenCalled();
	});

	it.skip("should try multiple matchers until one matches", async () => {
		const htmlContent =
			"siteKey: 'old_key_123456789012345678901234567890123456'";
		const mockBuffer = {
			toString: () => htmlContent,
		} as any;
		vi.mocked(fs.readFileSync).mockReturnValue(mockBuffer);
		vi.mocked(fs.writeFileSync).mockImplementation(() => {});
		vi.mocked(path.resolve).mockImplementation((...args) => {
			if (args.length === 1) {
				return args[0];
			}
			return args.join("/");
		});
		vi.mocked(at).mockImplementation((arr: any, idx: number) => {
			return arr?.[idx];
		});

		await updateDemoHTMLFiles(
			[/data-sitekey="(\w{48})"/, /siteKey:\s*'(\w{48})'/],
			"new_key_123456789012345678901234567890123456",
			mockLogger,
		);

		expect(fs.writeFileSync).toHaveBeenCalled();
	});
});
