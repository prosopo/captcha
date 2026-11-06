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

// Writes the .env.<mode> files a workflow needs, where <mode> is NODE_ENV
// unless --mode says otherwise. Every workflow calls this instead of copying
// env files inline, so the lists cannot drift apart. captcha-private calls it
// too (with --root pointing at its captcha submodule).
//
//   --mode <m>               env mode; default $NODE_ENV
//   --root <dir>             repo root; default this script's repo
//   --only <dir>[,<dir>]     write only these destination dirs
//   --https                  rewrite http://localhost to https:// (jobs with certs)
//   --verification-type <t>  set PROSOPO_VERIFICATION_TYPE in client-example-server
//   --dry-run                print the copies without writing
import {
	appendFileSync,
	copyFileSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

// dest dir -> template file, per mode. A dest without its own env.<mode>
// takes dev/scripts/env.<mode>, the workspace-wide template.
export const COPIES = {
	test: {
		".": "dev/scripts/env.test",
		"dev/scripts": "dev/scripts/env.test",
		"packages/cli": "dev/scripts/env.test",
		"packages/procaptcha-bundle": "dev/scripts/env.test",
		// The demos' env.test files are not usable by the test jobs (the server's
		// sets an environment its schema rejects); the development values point
		// at the same local provider and server the test jobs start.
		"demos/client-example-server":
			"demos/client-example-server/env.development",
		"demos/client-bundle-example":
			"demos/client-bundle-example/env.development",
	},
	production: {
		".": "dev/scripts/env.production",
		"packages/cli": "dev/scripts/env.production",
		"packages/procaptcha-bundle": "dev/scripts/env.production",
	},
};

// The provider image boots against the development chain, so its production
// env needs the development provider mnemonic.
const APPENDS = {
	production: [
		{
			dest: ".",
			from: "dev/scripts/env.development",
			key: "PROSOPO_PROVIDER_MNEMONIC",
		},
	],
};

const HTTPS_SKIP = new Set(["demos/client-example-server"]);

export const plan = ({ mode, only }) => {
	const copies = COPIES[mode];
	if (!copies) throw new Error(`no env files defined for mode "${mode}"`);
	const keep = (dest) => !only || only.includes(dest);
	return {
		copies: Object.entries(copies)
			.filter(([dest]) => keep(dest))
			.map(([dest, src]) => ({
				src,
				dest: join(dest, `.env.${mode}`),
				dir: dest,
			})),
		appends: (APPENDS[mode] ?? []).filter(({ dest }) => keep(dest)),
	};
};

const rewrite = (path, edit) =>
	writeFileSync(path, edit(readFileSync(path, "utf8")));

export const apply = ({
	root,
	mode,
	only,
	https,
	verificationType,
	dryRun,
	log = console.log,
}) => {
	const { copies, appends } = plan({ mode, only });
	for (const { src, dest, dir } of copies) {
		log(`${src} -> ${dest}`);
		if (dryRun) continue;
		const target = join(root, dest);
		copyFileSync(join(root, src), target);
		if (https && !HTTPS_SKIP.has(dir))
			rewrite(target, (text) =>
				text.replaceAll("http://localhost", "https://localhost"),
			);
		if (verificationType && dir === "demos/client-example-server")
			rewrite(target, (text) =>
				text.replace(
					/^PROSOPO_VERIFICATION_TYPE=.*$/m,
					`PROSOPO_VERIFICATION_TYPE=${verificationType}`,
				),
			);
	}
	for (const { dest, from, key } of appends) {
		const target = join(dest, `.env.${mode}`);
		log(`${from} ${key} >> ${target}`);
		if (dryRun) continue;
		const line = readFileSync(join(root, from), "utf8")
			.split("\n")
			.find((l) => l.startsWith(`${key}=`));
		if (!line) throw new Error(`${from} has no ${key}`);
		appendFileSync(join(root, target), `${line}\n`);
	}
};

const main = () => {
	const { values } = parseArgs({
		options: {
			mode: { type: "string", default: process.env.NODE_ENV ?? "" },
			root: {
				type: "string",
				default: resolve(dirname(fileURLToPath(import.meta.url)), "../.."),
			},
			only: { type: "string" },
			https: { type: "boolean", default: false },
			"verification-type": { type: "string" },
			"dry-run": { type: "boolean", default: false },
		},
	});
	apply({
		root: values.root,
		mode: values.mode,
		only: values.only?.split(","),
		https: values.https,
		verificationType: values["verification-type"],
		dryRun: values["dry-run"],
	});
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
