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
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { formatEnvToArray } from "./formatEnv.js";

let root = "";

const envWith = (contents: string): string => {
	const file = path.join(root, ".env");
	fs.writeFileSync(file, contents);
	return file;
};

beforeEach(() => {
	root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "formatEnv-")));
});

afterEach(() => {
	fs.rmSync(root, { recursive: true, force: true });
});

describe("formatEnvToArray", () => {
	it("returns an empty array literal for an empty file", () => {
		expect(formatEnvToArray(envWith(""))).toBe("[]");
	});

	it("returns an empty array literal for a file of blank lines", () => {
		expect(formatEnvToArray(envWith("\n\n\n"))).toBe("[]");
	});

	it("quotes a single assignment", () => {
		expect(formatEnvToArray(envWith("FOO=bar"))).toBe('["FOO=bar"]');
	});

	it("comma separates several assignments", () => {
		expect(formatEnvToArray(envWith("FOO=bar\nBAZ=qux"))).toBe(
			'["FOO=bar","BAZ=qux"]',
		);
	});

	it("keeps an assignment with an empty value", () => {
		expect(formatEnvToArray(envWith("FOO="))).toBe('["FOO="]');
	});

	it("treats a line with no equals sign as an empty assignment", () => {
		expect(formatEnvToArray(envWith("FOO"))).toBe('["FOO="]');
	});

	it("preserves equals signs inside the value", () => {
		expect(formatEnvToArray(envWith("FOO=a=b=c"))).toBe('["FOO=a=b=c"]');
	});

	it("escapes double quotes in the value, so json values survive", () => {
		expect(formatEnvToArray(envWith('FOO={"a": "b"}'))).toBe(
			'["FOO={\\"a\\": \\"b\\"}"]',
		);
	});

	it("drops blank lines between assignments", () => {
		expect(formatEnvToArray(envWith("FOO=bar\n\nBAZ=qux\n"))).toBe(
			'["FOO=bar","BAZ=qux"]',
		);
	});

	it("keeps comment lines, which it has no notion of", () => {
		expect(formatEnvToArray(envWith("# a comment"))).toBe('["# a comment="]');
	});

	it("resolves a relative path against the cwd", () => {
		const cwd = process.cwd();
		try {
			envWith("FOO=bar");
			process.chdir(root);
			expect(formatEnvToArray(".env")).toBe('["FOO=bar"]');
		} finally {
			process.chdir(cwd);
		}
	});

	it("throws when the file does not exist", () => {
		expect(() => formatEnvToArray(path.join(root, "missing"))).toThrow();
	});
});
