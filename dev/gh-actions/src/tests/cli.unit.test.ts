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

import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";

const execFileAsync = promisify(execFile);
const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

interface RunResult {
	code: number;
	stdout: string;
	stderr: string;
}

/**
 * Run a script the way a workflow would.
 *
 * These cover the `if (isMain(...))` entrypoints, which no in-process test can
 * reach. Each case is chosen to fail before any network call, so the suite
 * stays offline.
 */
const run = async (
	script: string,
	args: string[],
	env: NodeJS.ProcessEnv = {},
): Promise<RunResult> => {
	try {
		const { stdout, stderr } = await execFileAsync(
			"npx",
			["tsx", path.join(srcDir, script), ...args],
			{ env: { ...process.env, ...env }, timeout: 60_000 },
		);
		return { code: 0, stdout, stderr };
	} catch (error) {
		const failure = error as {
			code?: number;
			stdout?: string;
			stderr?: string;
		};
		return {
			code: failure.code ?? 1,
			stdout: failure.stdout ?? "",
			stderr: failure.stderr ?? "",
		};
	}
};

describe("command line entrypoints", () => {
	test("listDockerTags exits non-zero with usage when given no arguments", async () => {
		const result = await run("listDockerTags.ts", []);
		expect(result.code).not.toBe(0);
		expect(result.stderr).toContain("usage: listDockerTags");
	}, 90_000);

	test("previousDockerTag rejects a non-semver target before fetching", async () => {
		const result = await run("previousDockerTag.ts", ["a", "b", "latest"]);
		expect(result.code).not.toBe(0);
		expect(result.stderr).toContain("not semver: latest");
	}, 90_000);

	test("enableAutoMerge names the missing environment variable", async () => {
		const result = await run("enableAutoMerge.ts", [], {
			GITHUB_TOKEN: undefined,
			PR_NUMBER: undefined,
			REPO: undefined,
		});
		expect(result.code).not.toBe(0);
		expect(result.stderr).toContain("GITHUB_TOKEN env variable not set");
	}, 90_000);

	test("importing the barrel runs nothing", async () => {
		// Every script used to call main() at module scope, so importing one
		// performed a network fetch — or a GitHub mutation — as a side effect.
		const result = await run("../src/tests/importBarrel.ts", []);
		expect(result.stderr).toBe("");
		expect(result.stdout.trim()).toBe("imported");
		expect(result.code).toBe(0);
	}, 90_000);
});
