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

const run = promisify(execFile);
const packageRoot: string = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../..",
);

interface Result {
	stdout: string;
	stderr: string;
	code: number;
}

/** Run a module in its own process, so the entrypoint guard is really exercised. */
const execute = async (
	relativePath: string,
	env: Record<string, string> = {},
): Promise<Result> => {
	try {
		const { stdout, stderr } = await run("npx", ["tsx", relativePath], {
			cwd: packageRoot,
			env: { ...process.env, ...env },
			timeout: 60_000,
		});
		return { stdout, stderr, code: 0 };
	} catch (error) {
		const failure = error as {
			stdout?: string;
			stderr?: string;
			code?: number;
		};
		return {
			stdout: failure.stdout ?? "",
			stderr: failure.stderr ?? "",
			code: failure.code ?? 1,
		};
	}
};

describe("the package entrypoint", () => {
	test("runs the bot when it is the process entrypoint", async () => {
		// With no token it fails immediately, which is enough to prove it ran —
		// and proves it fails rather than silently doing nothing.
		const result: Result = await execute("src/index.ts", {
			GITHUB_TOKEN: "",
			GH_TOKEN: "",
			GITHUB_REPOSITORY: "prosopo/captcha",
		});
		expect(`${result.stdout}${result.stderr}`).toContain("no github token");
	}, 90_000);

	test("does nothing when the module is merely imported", async () => {
		// The bot used to call run() at module scope, so importing it for its
		// types or its command table ran the action.
		const result: Result = await execute("src/tests/importBarrel.ts", {
			GITHUB_TOKEN: "",
			GH_TOKEN: "",
			GITHUB_REPOSITORY: "prosopo/captcha",
		});
		expect(result.code).toBe(0);
		expect(result.stdout.trim()).toBe("imported: approve");
		expect(result.stdout).not.toContain("no github token");
	}, 90_000);
});
