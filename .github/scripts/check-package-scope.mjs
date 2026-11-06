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

/**
 * Fails when a tracked package.json names a package outside the @prosopo/
 * scope. An unscoped name can be squatted on the public registry, and a
 * dependency-confusion install would then resolve to a stranger's package.
 *
 * Covered: every tracked file whose basename is exactly package.json, so
 * workspace members, roots and standalone tooling alike. Exempt: files with
 * no "name" (type markers such as a test folder's {"type": "module"}) and
 * other manifests that merely end in package.json (ng-package.json).
 * Submodules are skipped because `git ls-files` does not descend into them;
 * each carries its own copy of this check.
 *
 * Usage: node check-package-scope.mjs [--root <dir>]
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

export const SCOPE = "@prosopo/";

/** Returns the problem with one manifest's text, or null when it is fine. */
export function checkManifest(text) {
	let manifest;
	try {
		manifest = JSON.parse(text);
	} catch (error) {
		return `invalid JSON: ${error.message}`;
	}
	if (manifest === null || typeof manifest !== "object") return null;
	const { name } = manifest;
	if (name === undefined) return null;
	if (typeof name !== "string" || !name.startsWith(SCOPE)) {
		return `name ${JSON.stringify(name)} is not in the ${SCOPE} scope`;
	}
	return null;
}

export function trackedManifests(root) {
	const out = execFileSync("git", ["-C", root, "ls-files", "-z"], {
		encoding: "utf8",
		maxBuffer: 256 * 1024 * 1024,
	});
	return out
		.split("\0")
		.filter((path) => path !== "" && basename(path) === "package.json");
}

/** Returns [{path, problem}] for every offending manifest under root. */
export function findViolations(root) {
	const violations = [];
	for (const path of trackedManifests(root)) {
		const problem = checkManifest(readFileSync(join(root, path), "utf8"));
		if (problem !== null) violations.push({ path, problem });
	}
	return violations;
}

function parseRoot(argv) {
	const i = argv.indexOf("--root");
	return i === -1 ? process.cwd() : argv[i + 1];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const violations = findViolations(parseRoot(process.argv.slice(2)));
	for (const { path, problem } of violations) {
		console.error(`${path}: ${problem}`);
	}
	if (violations.length > 0) {
		console.error(
			`\n${violations.length} package.json file(s) need a ${SCOPE} name. Mark new tooling "private": true as well.`,
		);
		process.exit(1);
	}
	console.log(`every named package.json is in the ${SCOPE} scope`);
}
