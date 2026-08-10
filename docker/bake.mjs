#!/usr/bin/env node
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

// Runs `docker buildx bake` with every image's version filled in from its
// package.json.
//
// docker-bake.hcl declares each version as a variable defaulting to "dev"
// rather than hardcoding it, because a hardcoded version in the bake file is
// a second place to bump on every release and so a place to forget. This
// script is what turns those defaults into real versions: it finds the
// packages that own an image, reads each one's version, and exports the
// matching <IMAGE>_VERSION variable before handing over to bake.
//
// Owning a docker image means having a build:docker script. That is the same
// signal the release workflow uses for publish:docker, so a package cannot be
// wired into one and silently missed by the other.
//
// The image name -> variable name mapping is mechanical:
//
//   prosopo/job-runner -> JOB_RUNNER_VERSION
//   prosopo/provider   -> PROVIDER_VERSION
//
// Any argument is forwarded to bake, so `npm run build:docker -- job-runner`
// and `npm run build:docker -- --print` behave as you would expect.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { glob } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dockerRepository } from "./docker-tag.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const rootManifest = JSON.parse(
	readFileSync(resolve(repoRoot, "package.json"), "utf8"),
);

// The workspace globs cover the packages that own an image. The wrapper
// packages under docker/images are deliberately not workspace members - they
// publish nothing to npm - so they have to be added explicitly or their
// images would silently build as :dev.
const patterns = [
	...rootManifest.workspaces.filter((pattern) => !pattern.startsWith("!")),
	"docker/images/*",
].map((pattern) => `${pattern}/package.json`);

const versions = new Map();
for await (const relativePath of glob(patterns, { cwd: repoRoot })) {
	const manifest = JSON.parse(
		readFileSync(resolve(repoRoot, relativePath), "utf8"),
	);
	if (!manifest.scripts?.["build:docker"]) continue;

	const variable = `${dockerRepository(manifest)
		.split("/")
		.pop()
		.toUpperCase()
		.replaceAll("-", "_")}_VERSION`;

	// Two packages claiming one image means one of them would win at random,
	// depending on glob order, and push the wrong version. Fail instead.
	const existing = versions.get(variable);
	if (existing && existing.version !== manifest.version) {
		throw new Error(
			`${variable} is claimed by both ${existing.name}@${existing.version} and ${manifest.name}@${manifest.version}`,
		);
	}
	versions.set(variable, { name: manifest.name, version: manifest.version });
}

const env = { ...process.env };
for (const [variable, { version }] of versions) {
	// An explicit override on the command line wins, so a one-off build of an
	// unreleased version does not need this file changed.
	env[variable] ??= version;
}

const { status } = spawnSync(
	"docker",
	["buildx", "bake", "-f", "docker-bake.hcl", ...process.argv.slice(2)],
	{ cwd: repoRoot, env, stdio: "inherit" },
);

process.exit(status ?? 1);
