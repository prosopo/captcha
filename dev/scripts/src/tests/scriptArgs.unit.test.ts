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

import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const packageDir = fileURLToPath(new URL("../..", import.meta.url));
const tsx = join(packageDir, "node_modules/.bin/tsx");

const run = (script: string, arg: string, env: NodeJS.ProcessEnv = {}) =>
	spawnSync(tsx, [`src/scripts/${script}`, arg], {
		cwd: packageDir,
		encoding: "utf8",
		env: { ...process.env, ...env },
		timeout: 30_000,
	});

describe("bytesToHex", () => {
	it("converts a byte list", () => {
		const result = run("bytesToHex.ts", "1,255,16");
		expect(result.status).toBe(0);
		expect(result.stdout).toContain("01ff10");
	}, 30_000);

	// Bad bytes used to print as "00" (NaN) or wrap (256 → 00).
	it.each(["1,abc", "1,256", "1,-1", "1,2x"])(
		"rejects %j",
		(arg) => {
			const result = run("bytesToHex.ts", arg);
			expect(result.status).not.toBe(0);
			expect(result.stderr).toContain("cannot parse integer");
		},
		30_000,
	);
});

describe("encodeDecode PROSOPO_SS58_FORMAT", () => {
	it("rejects a non-integer format instead of using NaN", () => {
		const result = run("encodeDecode.ts", "hello", {
			PROSOPO_SS58_FORMAT: "abc",
		});
		expect(result.status).not.toBe(0);
		expect(result.stderr).toContain("PROSOPO_SS58_FORMAT");
	}, 30_000);
});
