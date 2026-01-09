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

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the dependencies
vi.mock("node:path");
vi.mock("@polkadot/util");
vi.mock("@prosopo/common");
vi.mock("@prosopo/common");
vi.mock("@prosopo/dotenv");
vi.mock("@prosopo/types");
vi.mock("@prosopo/workspace");
vi.mock("yargs");
vi.mock("yargs/helpers");
vi.mock("../scripts/setVersion.js");
vi.mock("../setup/index.js");
vi.mock("../util/index.js");

describe("CLI processArgs", () => {
	let originalArgv: string[];
	let originalExit: any;
	let originalProcess: any;
	let processExitSpy: any;

	beforeEach(() => {
		originalArgv = process.argv;
		originalExit = process.exit;
		originalProcess = global.process;
		processExitSpy = vi.spyOn(process, "exit").mockImplementation(() => {});
	});

	afterEach(() => {
		process.argv = originalArgv;
		process.exit = originalExit;
		global.process = originalProcess;
		processExitSpy.mockRestore();
		vi.clearAllMocks();
	});

	it("should process create_env_files command", async () => {
		const mockExec = vi.fn().mockResolvedValue(undefined);
		vi.doMock("../util/index.js", () => ({
			exec: mockExec,
		}));

		const mockGetScriptsPkgDir = vi.fn().mockReturnValue("/test/scripts/dir");
		vi.doMock("@prosopo/workspace", () => ({
			getScriptsPkgDir: mockGetScriptsPkgDir,
		}));

		process.argv = ["node", "cli/index.js", "create_env_files"];

		// Import the CLI module which will execute processArgs
		await import("./index.js");

		expect(mockExec).toHaveBeenCalledWith("cp -v /test/scripts/dir/env.development /test/scripts/dir/.env.development");
	});

	it("should process setup command with provider and sites options", async () => {
		const mockSetup = vi.fn().mockResolvedValue(undefined);
		vi.doMock("../setup/index.js", () => ({
			setup: mockSetup,
		}));

		process.argv = ["node", "cli/index.js", "setup", "--provider", "--sites"];

		await import("./index.js");

		expect(mockSetup).toHaveBeenCalledWith(true, true);
	});

	it("should process setup command with default options", async () => {
		const mockSetup = vi.fn().mockResolvedValue(undefined);
		vi.doMock("../setup/index.js", () => ({
			setup: mockSetup,
		}));

		process.argv = ["node", "cli/index.js", "setup"];

		await import("./index.js");

		expect(mockSetup).toHaveBeenCalledWith(true, true);
	});

	it("should process version command", async () => {
		const mockSetVersion = vi.fn().mockResolvedValue(undefined);
		vi.doMock("../scripts/setVersion.js", () => ({
			default: mockSetVersion,
		}));

		process.argv = ["node", "cli/index.js", "version", "--v", "1.2.3"];

		await import("./index.js");

		expect(mockSetVersion).toHaveBeenCalledWith("1.2.3");
	});

	it("should process token command with hex input", async () => {
		const mockDecodeProcaptchaOutput = vi.fn().mockReturnValue({ decoded: "data" });
		vi.doMock("@prosopo/types", () => ({
			decodeProcaptchaOutput: mockDecodeProcaptchaOutput,
		}));

		const mockIsHex = vi.fn().mockReturnValue(true);
		vi.doMock("@polkadot/util", () => ({
			isHex: mockIsHex,
		}));

		process.argv = ["node", "cli/index.js", "token", "0x123456"];

		await import("./index.js");

		expect(mockIsHex).toHaveBeenCalledWith("0x123456");
		expect(mockDecodeProcaptchaOutput).toHaveBeenCalledWith("0x123456");
	});

	it("should process token command with JSON input", async () => {
		const mockEncodeProcaptchaOutput = vi.fn().mockReturnValue("encoded_hex");
		vi.doMock("@prosopo/types", () => ({
			encodeProcaptchaOutput: mockEncodeProcaptchaOutput,
		}));

		const mockIsHex = vi.fn().mockReturnValue(false);
		vi.doMock("@polkadot/util", () => ({
			isHex: mockIsHex,
		}));

		const testJson = '{"test": "data"}';
		process.argv = ["node", "cli/index.js", "token", testJson];

		await import("./index.js");

		expect(mockIsHex).toHaveBeenCalledWith(testJson);
		expect(mockEncodeProcaptchaOutput).toHaveBeenCalledWith(JSON.parse(testJson));
	});

	it("should handle errors and exit with code 1", async () => {
		const mockSetup = vi.fn().mockRejectedValue(new Error("Test error"));
		vi.doMock("../setup/index.js", () => ({
			setup: mockSetup,
		}));

		process.argv = ["node", "cli/index.js", "setup"];

		await import("./index.js");

		expect(processExitSpy).toHaveBeenCalledWith(1);
	});

	it("should handle invalid JSON in token command", async () => {
		const mockIsHex = vi.fn().mockReturnValue(false);
		vi.doMock("@polkadot/util", () => ({
			isHex: mockIsHex,
		}));

		process.argv = ["node", "cli/index.js", "token", "invalid json"];

		await import("./index.js");

		expect(processExitSpy).toHaveBeenCalledWith(1);
	});
});