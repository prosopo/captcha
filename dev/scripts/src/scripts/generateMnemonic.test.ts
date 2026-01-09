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
import { generateMnemonic } from "@prosopo/keyring";

// Mock the dependencies
vi.mock("@prosopo/keyring");
vi.mock("@prosopo/common");
vi.mock("@prosopo/dotenv");
vi.mock("../setup/index.js");

describe("generateMnemonic script", () => {
	let originalArgv: string[];
	let consoleErrorSpy: any;
	let processExitSpy: any;

	beforeEach(() => {
		originalArgv = process.argv;
		consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		processExitSpy = vi.spyOn(process, "exit").mockImplementation(() => {});
		vi.mocked(generateMnemonic).mockResolvedValue([
			"test mnemonic phrase",
			"5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
		]);
	});

	afterEach(() => {
		process.argv = originalArgv;
		consoleErrorSpy.mockRestore();
		processExitSpy.mockRestore();
		vi.clearAllMocks();
	});

	it("should generate mnemonic without updating env when --env flag not provided", async () => {
		process.argv = ["node", "generateMnemonic.ts"];

		// Import and run the script
		await import("./generateMnemonic.js");

		// Wait for the async operation to complete
		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(generateMnemonic).toHaveBeenCalled();
		expect(processExitSpy).toHaveBeenCalledWith(0);
	});

	it("should generate mnemonic and update env when --env flag provided", async () => {
		process.argv = ["node", "generateMnemonic.ts", "--env"];

		const updateEnvFileMock = vi.fn();
		vi.doMock("../setup/index.js", () => ({
			updateEnvFile: updateEnvFileMock,
		}));

		await import("./generateMnemonic.js");

		// Wait for the async operation to complete
		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(generateMnemonic).toHaveBeenCalled();
		expect(updateEnvFileMock).toHaveBeenCalledWith({
			PROSOPO_PROVIDER_MNEMONIC: `"test mnemonic phrase"`,
			PROSOPO_PROVIDER_ADDRESS: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
			PROSOPO_ADMIN_MNEMONIC: `"test mnemonic phrase"`,
			PROSOPO_ADMIN_ADDRESS: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
		});
		expect(processExitSpy).toHaveBeenCalledWith(0);
	});

	it("should handle errors and exit with code 1", async () => {
		const testError = new Error("Test error");
		vi.mocked(generateMnemonic).mockRejectedValue(testError);

		process.argv = ["node", "generateMnemonic.ts"];

		await import("./generateMnemonic.js");

		// Wait for the async operation to complete
		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(consoleErrorSpy).toHaveBeenCalledWith(testError);
		expect(processExitSpy).toHaveBeenCalledWith(1);
	});

	it("should handle generateMnemonic throwing synchronously", async () => {
		const testError = new Error("Sync error");
		vi.mocked(generateMnemonic).mockImplementation(() => {
			throw testError;
		});

		process.argv = ["node", "generateMnemonic.ts"];

		await import("./generateMnemonic.js");

		// Wait for the async operation to complete
		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(consoleErrorSpy).toHaveBeenCalledWith(testError);
		expect(processExitSpy).toHaveBeenCalledWith(1);
	});
});