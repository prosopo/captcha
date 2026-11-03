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
import { exec, spawn } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { generateMnemonic } from "@prosopo/keyring";
import { getCliPkgDir } from "@prosopo/workspace";
import { beforeAll, describe, expect, test } from "vitest";

const execPromise = promisify(exec);

type BundleRun = {
	code: number | null;
	stdout: string;
	stderr: string;
};

const rootDir: string = getCliPkgDir();
const bundlePath: string = path.join(
	rootDir,
	"dist",
	"bundle",
	"provider.cli.bundle.js",
);

const runBundle = (args: string[], stdin = ""): Promise<BundleRun> =>
	new Promise((resolve, reject) => {
		const child = spawn(process.execPath, [bundlePath, ...args], {
			cwd: rootDir,
		});
		let stdout = "";
		let stderr = "";
		child.stdout.on("data", (chunk: Buffer) => {
			stdout += chunk.toString();
		});
		child.stderr.on("data", (chunk: Buffer) => {
			stderr += chunk.toString();
		});
		child.on("error", reject);
		child.on("close", (code: number | null) => {
			resolve({ code, stdout, stderr });
		});
		child.stdin.end(stdin);
	});

const siteKeySettingsFlags: string[] = [
	"--captcha_type",
	"pow",
	"--domains",
	"example.com",
	"--pow_difficulty",
	"4",
	"--frictionless_threshold",
	"0.5",
	"--image_threshold",
	"0.8",
];

describe("provider bundle", () => {
	beforeAll(async () => {
		await execPromise(`cd ${rootDir} && NODE_ENV=production pnpm run bundle`);
	}, 120000);

	test("version prints the version and exits 0", async () => {
		const { code, stdout } = await runBundle(["version"]);
		expect(stdout).toMatch(/{"version":"\d+\.\d+\.\d+"}/);
		expect(code).toBe(0);
	}, 60000);

	test("an unknown command exits 1", async () => {
		const { code } = await runBundle(["not_a_command"]);
		expect(code).toBe(1);
	}, 60000);

	test("site_key_register without its settings flags exits 1", async () => {
		const [, siteKey] = await generateMnemonic();
		const { code } = await runBundle(["site_key_register", siteKey, "free"]);
		expect(code).toBe(1);
	}, 60000);

	test("site_key_register with an invalid site key exits 1", async () => {
		const { code } = await runBundle([
			"site_key_register",
			"not-an-address",
			"free",
			...siteKeySettingsFlags,
		]);
		expect(code).toBe(1);
	}, 60000);

	test("detector_pool_set with malformed input exits 1", async () => {
		const { code } = await runBundle(["detector_pool_set"], "{not json");
		expect(code).toBe(1);
	}, 60000);

	test("site_key_register with every required flag exits 0", async () => {
		const [, siteKey] = await generateMnemonic();
		const { code, stdout } = await runBundle([
			"site_key_register",
			siteKey,
			"free",
			...siteKeySettingsFlags,
		]);
		expect(stdout).toContain("Site Key registered");
		expect(code).toBe(0);
	}, 60000);
});
