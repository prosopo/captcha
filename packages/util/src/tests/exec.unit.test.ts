import { fail } from "node:assert";
import { describe, expect, test } from "vitest";
import { exec } from "../exec.js";
// Copyright 2021-2024 Prosopo (UK) Ltd.
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

describe("exec", () => {
	test("valid cmd exit 0", async () => {
		try {
			const cmd = "echo hello world"
			const result = await exec(cmd);
			expect(result).toStrictEqual({
				cmd,
				stdout: "hello world\n",
				stderr: "",
			});
		} catch (e) {
			fail("expected command to succeed");
		}
	});

	test("invalid cmd", async () => {
		const cmd = "some-invalid-command"
		try {
			const result = await exec(cmd);
			console.log(result)
			fail("expected command to fail");
		} catch (e) {
			expect(e).toStrictEqual({
				cmd,
				stdout: "",
				stderr: `/bin/sh: 1: ${cmd}: not found\n`,
				exitCode: 127,
			});
		}
	});

	test("valid cmd exit !0", async () => {
		const cmd = "test 1 -eq 2"
		try {
			const result = await exec(cmd);
			fail("expected command to fail");
		} catch (e) {
			expect(e).toStrictEqual({
				cmd,
				stdout: "",
				stderr: "",
				exitCode: 1,
			});
		}
	});
});
