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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type ExecOutput, exec } from "./exec.js";

// `exec` rejects with the output object rather than an Error, so the usual
// `rejects.toThrow` matchers do not apply.
const expectRejection = async (
	promise: Promise<ExecOutput>,
): Promise<ExecOutput> => {
	try {
		await promise;
	} catch (error) {
		return error as ExecOutput;
	}
	throw new Error("expected the command to reject");
};

describe("exec", () => {
	let logs: string[] = [];

	beforeEach(() => {
		logs = [];
		vi.spyOn(console, "log").mockImplementation((...args: unknown[]): void => {
			logs.push(args.map(String).join(" "));
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("resolves with the captured stdout on success", async () => {
		const output = await exec("echo hello", { pipe: false, printCmd: false });
		expect(output.stdout).toBe("hello\n");
		expect(output.stderr).toBe("");
		expect(output.code).toBe(0);
	});

	it("captures stderr on success", async () => {
		const output = await exec("echo oops 1>&2", {
			pipe: false,
			printCmd: false,
		});
		expect(output.stderr).toBe("oops\n");
		expect(output.stdout).toBe("");
	});

	it("rejects with the output object on a non-zero exit code", async () => {
		const output = await expectRejection(
			exec("echo bad 1>&2; exit 3", { pipe: false, printCmd: false }),
		);
		expect(output.code).toBe(3);
		expect(output.stderr).toBe("bad\n");
	});

	it("rejects rather than throwing for an unknown command", async () => {
		const output = await expectRejection(
			exec("this-command-does-not-exist-xyz", {
				pipe: false,
				printCmd: false,
			}),
		);
		expect(output.code).not.toBe(0);
	});

	it("concatenates output arriving in multiple chunks", async () => {
		const output = await exec("echo one; echo two; echo three", {
			pipe: false,
			printCmd: false,
		});
		expect(output.stdout).toBe("one\ntwo\nthree\n");
	});

	it("resolves with empty strings when the command produces no output", async () => {
		const output = await exec("true", { pipe: false, printCmd: false });
		expect(output).toEqual({ stdout: "", stderr: "", code: 0 });
	});

	it("prints the command by default", async () => {
		await exec("true", { pipe: false });
		expect(logs).toContain("[exec] true");
	});

	it("prints the command when printCmd is explicitly true", async () => {
		await exec("true", { pipe: false, printCmd: true });
		expect(logs).toContain("[exec] true");
	});

	it("does not print the command when printCmd is false", async () => {
		await exec("true", { pipe: false, printCmd: false });
		expect(logs).toEqual([]);
	});

	it("treats a missing options object as pipe and printCmd enabled", async () => {
		await exec("true");
		// the command line, then the blank line emitted on close when piping
		expect(logs).toEqual(["[exec] true", ""]);
	});

	it("emits the trailing blank line only when piping", async () => {
		await exec("true", { pipe: false });
		expect(logs).not.toContain("");
	});

	it("still captures output while piping", async () => {
		const output = await exec("echo piped", { printCmd: false });
		expect(output.stdout).toBe("piped\n");
	});

	it("prints the command even when the command fails", async () => {
		await expectRejection(exec("exit 1", { pipe: false }));
		expect(logs).toContain("[exec] exit 1");
	});
});
