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

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { checkManifest, findViolations } from "./check-package-scope.mjs";

const SCRIPT = join(
	dirname(fileURLToPath(import.meta.url)),
	"check-package-scope.mjs",
);

describe("checkManifest", () => {
	it("accepts a scoped name", () => {
		assert.equal(checkManifest('{"name": "@prosopo/foo"}'), null);
	});
	it("accepts a manifest with no name", () => {
		assert.equal(checkManifest('{"type": "module"}'), null);
	});
	it("rejects an unscoped name", () => {
		assert.match(
			checkManifest('{"name": "foo"}'),
			/"foo" is not in the @prosopo\/ scope/,
		);
	});
	it("rejects another scope", () => {
		assert.notEqual(checkManifest('{"name": "@other/foo"}'), null);
	});
	it("rejects a lookalike prefix", () => {
		assert.notEqual(checkManifest('{"name": "@prosopofoo/bar"}'), null);
	});
	it("rejects a non-string name", () => {
		assert.notEqual(checkManifest('{"name": 1}'), null);
	});
	it("reports invalid JSON", () => {
		assert.match(checkManifest("{"), /invalid JSON/);
	});
	it("ignores a non-object document", () => {
		assert.equal(checkManifest("[]"), null);
		assert.equal(checkManifest("null"), null);
	});
});

describe("CLI on a fixture repo", () => {
	const dirs = [];
	after(() => {
		for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
	});

	function fixture(files) {
		const root = mkdtempSync(join(tmpdir(), "package-scope-"));
		dirs.push(root);
		for (const [path, body] of Object.entries(files)) {
			mkdirSync(dirname(join(root, path)), { recursive: true });
			writeFileSync(join(root, path), body);
		}
		execFileSync("git", ["init", "-q", root]);
		execFileSync("git", ["-C", root, "add", "-A"]);
		return root;
	}

	function run(root) {
		return spawnSync(process.execPath, [SCRIPT, "--root", root], {
			encoding: "utf8",
		});
	}

	it("exits 1 on an unscoped name", () => {
		const root = fixture({ "package.json": '{"name": "foo"}' });
		const result = run(root);
		assert.equal(result.status, 1);
		assert.match(result.stderr, /package\.json: name "foo"/);
	});

	it("exits 0 when every name is scoped and exempt files are skipped", () => {
		const root = fixture({
			"package.json": '{"name": "@prosopo/root"}',
			"pkg/package.json": '{"name": "@prosopo/pkg"}',
			"tests/package.json": '{"type": "module"}',
			"lib/ng-package.json": '{"name": "not-a-package"}',
		});
		const result = run(root);
		assert.equal(result.status, 0, result.stderr);
		assert.deepEqual(findViolations(root), []);
	});

	it("skips untracked manifests", () => {
		const root = fixture({ "package.json": '{"name": "@prosopo/root"}' });
		writeFileSync(join(root, "stray.package.json"), '{"name": "foo"}');
		mkdirSync(join(root, "untracked"));
		writeFileSync(join(root, "untracked/package.json"), '{"name": "foo"}');
		assert.deepEqual(findViolations(root), []);
	});
});
