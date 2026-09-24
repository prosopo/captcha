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

// Each oversized call runs in a child process: before the cap, a u32::MAX
// pair overflowed the size calculation and the panic aborted the process,
// which would take the test runner down with it.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const binding = require.resolve("../index.js");

const call = (fn, width, height) =>
	spawnSync(
		process.execPath,
		[
			"-e",
			`const m = require(${JSON.stringify(binding)});
try {
	const out = m.${fn}(Buffer.alloc(16, 7), ${width}, ${height});
	console.log("ok " + out.length);
} catch (e) {
	console.log("threw " + e.code + " " + e.message);
}`,
		],
		{ encoding: "utf8", timeout: 30_000 },
	);

for (const fn of ["generateBackground", "generateBackgroundSeparable"]) {
	for (const [width, height] of [
		[4294967295, 4294967295],
		[4097, 1],
		[1, 4097],
	]) {
		test(`${fn} rejects ${width}x${height} with a JS error`, () => {
			const result = call(fn, width, height);
			assert.equal(result.status, 0, result.stderr);
			assert.match(result.stdout, /^threw InvalidArg .*at most 4096/);
		});
	}

	test(`${fn} still renders a normal puzzle`, () => {
		const result = call(fn, 300, 200);
		assert.equal(result.status, 0, result.stderr);
		assert.equal(result.stdout.trim(), `ok ${300 * 200 * 4}`);
	});
}
