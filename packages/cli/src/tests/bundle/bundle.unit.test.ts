import { exec } from "node:child_process";
import { promisify } from "node:util";
import { getCliPkgDir } from "@prosopo/workspace";
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
import { assert, describe, test } from "vitest";
const execPromise = promisify(exec);

describe("provider bundle", () => {
	test("bundle runs after bundling", async () => {
		// get root directory of this package
		const rootDir = getCliPkgDir();

		// build bundle
		await execPromise(`cd ${rootDir} && NODE_ENV=production npm run bundle`);

		// Set minimum required environment variables for config validation
		const mnemonic = "test test test test test test test test test test test junk";
		const envVars = [
			"CADDY_DOMAIN=localhost",
			"PROSOPO_IPAPI_KEY=test",
			"PROSOPO_IPAPI_URL=https://test.com",
			`PROSOPO_PROVIDER_MNEMONIC="${mnemonic}"`,
			"PROSOPO_DATABASE_HOST=localhost",
			"PROSOPO_PROVIDER_ADDRESS=5GrwvaEF5zXb26Fz9rcQpDWS57CERrH4kYWwymqL8",
			"PROSOPO_ADMIN_ADDRESS=5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
			`PROSOPO_ADMIN_MNEMONIC="${mnemonic}"`,
		].join(" ");

		// run bundle and get version
		const { stdout: runOut, stderr: runErr } = await execPromise(
			`cd ${rootDir} && ${envVars} node dist/bundle/provider.cli.bundle.js version`,
		);
		assert(/{"version":"\d+\.\d+\.\d+"}/.test(runOut));
	}, 120000);
});
