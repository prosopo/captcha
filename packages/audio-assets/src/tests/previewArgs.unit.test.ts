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
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const packageDir = fileURLToPath(new URL("../..", import.meta.url));
const tsx = join(packageDir, "node_modules/.bin/tsx");

describe("preview script --count", () => {
	let dir: string | undefined;
	afterEach(() => {
		if (dir) rmSync(dir, { recursive: true, force: true });
		dir = undefined;
	});

	// A bad count used to become NaN or a truncated number and render
	// nothing (or the wrong amount) without complaint.
	it.each(["abc", "12abc", "1.5", "0", "-3", ""])(
		"rejects %j before writing anything",
		(count) => {
			dir = mkdtempSync(join(tmpdir(), "preview-"));
			const out = join(dir, "out");
			const run = spawnSync(
				tsx,
				["scripts/preview.ts", "--count", count, "--out", out],
				{ cwd: packageDir, encoding: "utf8", timeout: 30_000 },
			);
			expect(run.status).not.toBe(0);
			expect(run.stderr).toContain("--count must be a positive integer");
			expect(existsSync(out)).toBe(false);
		},
		30_000,
	);
});
