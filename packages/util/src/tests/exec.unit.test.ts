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
			const result = await exec("echo hello world");
			expect(result).toStrictEqual({
				stdout: "hello world\n",
				stderr: "",
				code: 0,
			});
		} catch (e) {
			fail("expected command to succeed");
		}
	});

	test("invalid cmd", async () => {
		try {
			const result = await exec("some-invalid-command");
			fail("expected command to fail");
		} catch (e) {
			expect(e).toStrictEqual({
				stdout: "",
				stderr: "sh: 1: some-invalid-command: not found\n",
				code: 127,
			});
		}
	});

	test("valid cmd exit !0", async () => {
		try {
			const result = await exec('test "1" "==" "2"');
			fail("expected command to fail");
		} catch (e) {
			expect(e).toStrictEqual({
				stdout: "",
				stderr: "",
				code: 1,
			});
		}
	});
});
