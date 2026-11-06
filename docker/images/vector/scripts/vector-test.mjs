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

// Validates src/vector.toml and runs its [[tests]] inside the vector image the
// Dockerfile pins, so the check exercises exactly the vector version that ships
// (0.57 changed env interpolation and broke the sinks without any error, see
// the Dockerfile).
//
//   node scripts/vector-test.mjs              validate + unit-test the config
//   node scripts/vector-test.mjs --negative   prove an unset ${VAR} and a VRL
//                                             compile error both fail the check

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(packageDir, "src");

export const pinnedImage = (dockerfile) => {
	const match = dockerfile.match(/^FROM\s+(\S+)/m);
	if (!match) throw new Error("no FROM line in Dockerfile");
	return match[1];
};

// ${VAR} / ${VAR:?err} are interpolated at load time; get_env_var!("VAR") is
// read by VRL when an event is processed, so `vector test` needs it too.
export const envVars = (config) => {
	const names = new Set();
	for (const m of config.matchAll(/\$\{([A-Za-z_][A-Za-z0-9_]*)/g))
		names.add(m[1]);
	for (const m of config.matchAll(/get_env_var!?\(\s*"([^"]+)"/g))
		names.add(m[1]);
	return [...names].sort();
};

export const dummyEnv = (names) =>
	Object.fromEntries(
		names.map((name) => [name, `dummy_${name.toLowerCase()}`]),
	);

export const breakVrl = (config) => {
	const marker = "[transforms.provider_format]";
	const at = config.indexOf(marker);
	if (at < 0) throw new Error(`${marker} not found`);
	const sourceAt = config.indexOf("source = '''", at);
	const bodyAt = sourceAt + "source = '''".length;
	return `${config.slice(0, bodyAt)}\nthis is not vrl(\n${config.slice(bodyAt)}`;
};

const runVector = (image, configDir, env, args) => {
	const envArgs = Object.entries(env).flatMap(([k, v]) => ["-e", `${k}=${v}`]);
	const result = spawnSync(
		"timeout",
		[
			"300",
			"docker",
			"run",
			"--rm",
			"--memory=512m",
			"-v",
			`${configDir}:/cfg:ro`,
			...envArgs,
			image,
			...args,
		],
		{ stdio: ["ignore", "inherit", "inherit"] },
	);
	if (result.error) throw result.error;
	return result.status;
};

const checkConfig = (image, configDir, env) => {
	const validate = runVector(image, configDir, env, [
		"validate",
		"--no-environment",
		"/cfg/vector.toml",
	]);
	if (validate !== 0) return validate;
	return runVector(image, configDir, env, ["test", "/cfg/vector.toml"]);
};

const withConfig = (config, fn) => {
	const dir = mkdtempSync(join(tmpdir(), "vector-test-"));
	try {
		writeFileSync(join(dir, "vector.toml"), config);
		return fn(dir);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
};

const main = (argv) => {
	const image = pinnedImage(readFileSync(join(srcDir, "Dockerfile"), "utf8"));
	const config = readFileSync(join(srcDir, "vector.toml"), "utf8");
	const names = envVars(config);
	const env = dummyEnv(names);

	if (!argv.includes("--negative")) {
		const status = checkConfig(image, srcDir, env);
		if (status !== 0) process.exit(status ?? 1);
		return;
	}

	const { [names[0]]: _unset, ...missingOne } = env;
	const cases = [
		{ name: `unset ${names[0]}`, config, env: missingOne },
		{ name: "broken VRL in provider_format", config: breakVrl(config), env },
	];
	let failed = false;
	for (const c of cases) {
		const status = withConfig(c.config, (dir) =>
			checkConfig(image, dir, c.env),
		);
		const ok = status !== 0;
		console.log(
			`negative case "${c.name}": ${ok ? "failed as expected" : "UNEXPECTEDLY PASSED"}`,
		);
		if (!ok) failed = true;
	}
	if (failed) process.exit(1);
};

if (process.argv[1] === fileURLToPath(import.meta.url))
	main(process.argv.slice(2));
