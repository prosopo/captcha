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
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import { COPIES, apply, plan } from "./setup-env-files.mjs";

let root;
const put = (path, text) => {
	mkdirSync(dirname(join(root, path)), { recursive: true });
	writeFileSync(join(root, path), text);
};
const read = (path) => readFileSync(join(root, path), "utf8");

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), "env-files-"));
	for (const mode of Object.keys(COPIES))
		for (const [dest, src] of Object.entries(COPIES[mode])) {
			put(
				src,
				`URL=http://localhost:9229\nPROSOPO_VERIFICATION_TYPE=api\nSRC=${src}\n`,
			);
			mkdirSync(join(root, dest), { recursive: true });
		}
	put(
		"dev/scripts/env.development",
		"OTHER=1\nPROSOPO_PROVIDER_MNEMONIC=dev words\n",
	);
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

test("unknown mode is an error", () => {
	assert.throws(
		() => plan({ mode: "nope" }),
		/no env files defined for mode "nope"/,
	);
	assert.throws(() => plan({ mode: "" }), /mode ""/);
});

test("every copy writes .env.<mode>", () => {
	for (const { dest } of plan({ mode: "test" }).copies)
		assert.match(dest, /\.env\.test$/);
	for (const { dest } of plan({ mode: "production" }).copies)
		assert.match(dest, /\.env\.production$/);
});

test("only filters copies and appends", () => {
	const { copies, appends } = plan({
		mode: "production",
		only: ["packages/procaptcha-bundle"],
	});
	assert.deepEqual(
		copies.map((c) => c.dir),
		["packages/procaptcha-bundle"],
	);
	assert.deepEqual(appends, []);
});

test("dry run writes nothing", () => {
	const lines = [];
	apply({ root, mode: "test", dryRun: true, log: (l) => lines.push(l) });
	assert.equal(lines.length, Object.keys(COPIES.test).length);
	assert.throws(() => read(".env.test"));
});

test("test mode copies templates, https and verification type applied", () => {
	apply({
		root,
		mode: "test",
		https: true,
		verificationType: "local",
		log: () => {},
	});
	assert.match(read("packages/cli/.env.test"), /URL=https:\/\/localhost/);
	assert.match(read("packages/cli/.env.test"), /SRC=dev\/scripts\/env.test/);
	const server = read("demos/client-example-server/.env.test");
	assert.match(server, /URL=http:\/\/localhost/);
	assert.match(server, /^PROSOPO_VERIFICATION_TYPE=local$/m);
	assert.match(
		read("demos/client-bundle-example/.env.test"),
		/PROSOPO_VERIFICATION_TYPE=api/,
	);
});

test("without flags, contents are copied unchanged", () => {
	apply({ root, mode: "test", log: () => {} });
	assert.match(read(".env.test"), /URL=http:\/\/localhost/);
	assert.match(read("demos/client-example-server/.env.test"), /=api$/m);
});

test("production appends the development mnemonic once", () => {
	apply({ root, mode: "production", log: () => {} });
	const env = read(".env.production");
	assert.equal(env.match(/PROSOPO_PROVIDER_MNEMONIC=dev words/g)?.length, 1);
	assert.doesNotMatch(read("packages/cli/.env.production"), /MNEMONIC/);
});

test("missing mnemonic is an error", () => {
	put("dev/scripts/env.development", "OTHER=1\n");
	assert.throws(
		() => apply({ root, mode: "production", log: () => {} }),
		/has no PROSOPO_PROVIDER_MNEMONIC/,
	);
});
