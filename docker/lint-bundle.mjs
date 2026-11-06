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

// Lints the compose bundle in the current directory: every compose file must
// parse, and every Caddyfile must already be in `caddy fmt` form.
//
// Compose files are checked with --no-interpolate because their variables
// come from the deploy host's .env files, which do not exist here. Caddyfiles
// are only formatted, not adapted: they use plugins (chaddy, layer4) that
// stock caddy lacks, so `caddy validate` would reject valid configs.
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";

// Same caddy release as docker/images/caddy, so fmt agrees with what we ship.
const CADDY_IMAGE =
	"caddy:2.11.4@sha256:0c994536bddb66445885237f1a5dcc1916bccea922661c76b4e9fc24061f9b52";

const run = (command, args) => {
	const { status, stderr } = spawnSync(command, args, {
		encoding: "utf8",
		timeout: 120_000,
	});
	return { ok: status === 0, stderr: stderr ?? "" };
};

const files = readdirSync(".").sort();
const failures = [];

for (const file of files.filter((name) => /\.ya?ml$/.test(name))) {
	const { ok, stderr } = run("docker", [
		"compose",
		"-f",
		file,
		"config",
		"--quiet",
		"--no-interpolate",
	]);
	if (!ok) failures.push(`${file}: ${stderr.trim()}`);
}

for (const file of files.filter((name) => name.endsWith("Caddyfile"))) {
	const { ok } = run("docker", [
		"run",
		"--rm",
		"--volume",
		`${process.cwd()}:/bundle:ro`,
		CADDY_IMAGE,
		"caddy",
		"fmt",
		"--diff",
		`/bundle/${file}`,
	]);
	if (!ok)
		failures.push(`${file}: not in caddy fmt form (run caddy fmt --overwrite)`);
}

for (const failure of failures) console.error(failure);
process.exit(failures.length === 0 ? 0 : 1);
