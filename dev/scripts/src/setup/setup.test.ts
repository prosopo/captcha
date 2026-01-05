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

import { getEnvFile } from "@prosopo/dotenv";
import { getRootDir } from "@prosopo/workspace";
import fse from "fs-extra";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateEnvFile } from "./setup.js";

vi.mock("fs-extra");
vi.mock("@prosopo/dotenv");
vi.mock("@prosopo/workspace");

describe("updateEnvFile", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getRootDir).mockReturnValue("/test/root");
		vi.mocked(getEnvFile).mockReturnValue("/test/root/.env");
	});

	it("should update existing env variable", async () => {
		const envContent = "PROSOPO_SITE_KEY=old_value\nOTHER_VAR=other";
		vi.mocked(fse.readFile).mockResolvedValue(envContent);
		vi.mocked(fse.writeFile).mockResolvedValue(undefined);

		await updateEnvFile({
			PROSOPO_SITE_KEY: "new_value",
		});

		expect(fse.readFile).toHaveBeenCalledWith("/test/root/.env", "utf8");
		expect(fse.writeFile).toHaveBeenCalled();
		const writtenContent = await vi.mocked(fse.writeFile).mock.calls[0][1];
		expect(writtenContent).toContain("PROSOPO_SITE_KEY=new_value");
		expect(writtenContent).toContain("OTHER_VAR=other");
	});

	it("should add new env variable if it doesn't exist", async () => {
		const envContent = "EXISTING_VAR=value";
		vi.mocked(fse.readFile).mockResolvedValue(envContent);
		vi.mocked(fse.writeFile).mockResolvedValue(undefined);

		await updateEnvFile({
			NEW_VAR: "new_value",
		});

		const writtenContent = await vi.mocked(fse.writeFile).mock.calls[0][1];
		expect(writtenContent).toContain("EXISTING_VAR=value");
		expect(writtenContent).toContain("NEW_VAR=new_value");
	});

	it("should update multiple env variables", async () => {
		const envContent = "VAR1=old1\nVAR2=old2";
		vi.mocked(fse.readFile).mockResolvedValue(envContent);
		vi.mocked(fse.writeFile).mockResolvedValue(undefined);

		await updateEnvFile({
			VAR1: "new1",
			VAR2: "new2",
		});

		const writtenContent = await vi.mocked(fse.writeFile).mock.calls[0][1];
		expect(writtenContent).toContain("VAR1=new1");
		expect(writtenContent).toContain("VAR2=new2");
	});

	it("should handle env variables with quotes", async () => {
		const envContent = 'MNEMONIC="old mnemonic"';
		vi.mocked(fse.readFile).mockResolvedValue(envContent);
		vi.mocked(fse.writeFile).mockResolvedValue(undefined);

		await updateEnvFile({
			MNEMONIC: '"new mnemonic"',
		});

		const writtenContent = await vi.mocked(fse.writeFile).mock.calls[0][1];
		expect(writtenContent).toContain('MNEMONIC="new mnemonic"');
	});

	it("should preserve other env variables when updating", async () => {
		const envContent = "VAR1=value1\nVAR2=value2\nVAR3=value3";
		vi.mocked(fse.readFile).mockResolvedValue(envContent);
		vi.mocked(fse.writeFile).mockResolvedValue(undefined);

		await updateEnvFile({
			VAR2: "updated2",
		});

		const writtenContent = await vi.mocked(fse.writeFile).mock.calls[0][1];
		expect(writtenContent).toContain("VAR1=value1");
		expect(writtenContent).toContain("VAR2=updated2");
		expect(writtenContent).toContain("VAR3=value3");
	});
});
