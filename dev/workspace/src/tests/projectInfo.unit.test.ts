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

import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import * as projectInfo from "../projectInfo.js";
import {
	getAccountPkgDir,
	getApiPkgDir,
	getCacheDir,
	getCliPkgDir,
	getClientBundleExampleDir,
	getClientExampleServerDir,
	getCommonPkgDir,
	getConfigPkgDir,
	getDatabasePkgDir,
	getDatasetsFsPkgDir,
	getDatasetsPkgDir,
	getDemosDir,
	getDevDir,
	getDotEnvPkgDir,
	getEnvPkgDir,
	getFileServerPkgDir,
	getLocalePkgDir,
	getNodeModulesDir,
	getPackagesDir,
	getProcaptchaBundlePkgDir,
	getProcaptchaCommonPkgDir,
	getProcaptchaFrictionlessPkgDir,
	getProcaptchaPkgDir,
	getProcaptchaPoWPkgDir,
	getProcaptchaReactPkgDir,
	getProviderPkgDir,
	getRootDir,
	getScriptsPkgDir,
	getServerPkgDir,
	getTestResultsDir,
	getTypesDatabasePkgDir,
	getTypesEnvPkgDir,
	getTypesPkgDir,
	getUtilPkgDir,
	getWidgetSkeletonPkgDir,
} from "../projectInfo.js";

describe("getRootDir", () => {
	test("resolves to the repository root, identified by its package.json name", () => {
		// The whole module is a tree of string concatenations hanging off this
		// one value, so if it is wrong every other getter is wrong too.
		const manifest: unknown = JSON.parse(
			fs.readFileSync(path.join(getRootDir(), "package.json"), "utf8"),
		);
		expect(manifest).toMatchObject({ name: "@prosopo/captcha" });
	});

	test("returns an absolute path", () => {
		expect(path.isAbsolute(getRootDir())).toBe(true);
	});

	test("has no trailing separator, so `${dir}/x` yields a single slash", () => {
		// Callers interpolate rather than path.join, so a trailing separator
		// would produce `//` in every derived path.
		expect(getRootDir().endsWith(path.sep)).toBe(false);
		expect(getPackagesDir()).not.toContain("//");
	});

	test("contains no percent-encoding", () => {
		// `new URL(...).pathname` is percent-encoded, so a checkout under a path
		// containing a space or a `#` used to yield `%20`/`%23` and every derived
		// path failed to resolve.
		expect(getRootDir()).not.toMatch(/%[0-9A-Fa-f]{2}/);
	});

	test("is stable across calls", () => {
		expect(getRootDir()).toBe(getRootDir());
	});

	test("locates the root the same way whether imported from src or dist", () => {
		// Both layouts sit at the same depth (dev/workspace/{src,dist}), which is
		// what makes the fixed `../../..` correct. If either moves, this breaks.
		expect(path.basename(path.dirname(getDevDir()))).toBe(
			path.basename(getRootDir()),
		);
	});
});

describe("top-level directories", () => {
	const cases: [string, () => string, string][] = [
		["cache", getCacheDir, ".cache"],
		["dev", getDevDir, "dev"],
		["demos", getDemosDir, "demos"],
		["packages", getPackagesDir, "packages"],
		["node_modules", getNodeModulesDir, "node_modules"],
	];

	test.each(cases)("%s hangs directly off the root", (_name, getter, leaf) => {
		expect(getter()).toBe(`${getRootDir()}/${leaf}`);
	});

	test("test results live under the cache dir, not the root", () => {
		// The cache dir is gitignored wholesale; putting results anywhere else
		// would commit them.
		expect(getTestResultsDir()).toBe(`${getCacheDir()}/test-results`);
		expect(getTestResultsDir().startsWith(`${getCacheDir()}/`)).toBe(true);
	});
});

// Every getter is a hand-written string. A package that is renamed or removed
// leaves the getter silently pointing at nothing, and the caller only finds out
// at runtime — which is how `getClientExampleDir` and `getDappExampleDir` came
// to return paths for directories that no longer exist. Asserting the target
// exists is the only thing that catches that.
describe("every exported directory getter points at a directory that exists", () => {
	const getters: [string, () => string][] = [
		["getRootDir", getRootDir],
		["getDevDir", getDevDir],
		["getDemosDir", getDemosDir],
		["getPackagesDir", getPackagesDir],
		["getNodeModulesDir", getNodeModulesDir],
		["getConfigPkgDir", getConfigPkgDir],
		["getScriptsPkgDir", getScriptsPkgDir],
		["getClientExampleServerDir", getClientExampleServerDir],
		["getClientBundleExampleDir", getClientBundleExampleDir],
		["getAccountPkgDir", getAccountPkgDir],
		["getApiPkgDir", getApiPkgDir],
		["getCliPkgDir", getCliPkgDir],
		["getCommonPkgDir", getCommonPkgDir],
		["getDatabasePkgDir", getDatabasePkgDir],
		["getDatasetsPkgDir", getDatasetsPkgDir],
		["getDatasetsFsPkgDir", getDatasetsFsPkgDir],
		["getDotEnvPkgDir", getDotEnvPkgDir],
		["getEnvPkgDir", getEnvPkgDir],
		["getFileServerPkgDir", getFileServerPkgDir],
		["getProcaptchaPkgDir", getProcaptchaPkgDir],
		["getProcaptchaBundlePkgDir", getProcaptchaBundlePkgDir],
		["getProcaptchaCommonPkgDir", getProcaptchaCommonPkgDir],
		["getProcaptchaFrictionlessPkgDir", getProcaptchaFrictionlessPkgDir],
		["getProcaptchaPoWPkgDir", getProcaptchaPoWPkgDir],
		["getProcaptchaReactPkgDir", getProcaptchaReactPkgDir],
		["getProviderPkgDir", getProviderPkgDir],
		["getServerPkgDir", getServerPkgDir],
		["getTypesPkgDir", getTypesPkgDir],
		["getTypesDatabasePkgDir", getTypesDatabasePkgDir],
		["getTypesEnvPkgDir", getTypesEnvPkgDir],
		["getUtilPkgDir", getUtilPkgDir],
		["getWidgetSkeletonPkgDir", getWidgetSkeletonPkgDir],
		["getLocalePkgDir", getLocalePkgDir],
	];

	test.each(getters)("%s", (_name, getter) => {
		const target = getter();
		expect(fs.existsSync(target), target).toBe(true);
		expect(fs.statSync(target).isDirectory(), target).toBe(true);
	});

	// getCacheDir and getTestResultsDir are excluded above: both are created on
	// demand by a test run, so a clean checkout legitimately lacks them.
	test("the cache dir is the only getter allowed not to exist yet", () => {
		expect(getCacheDir()).toBe(`${getRootDir()}/.cache`);
	});

	test("the list above covers every exported getter", () => {
		// Guards against a new getter being added without an existence check.
		const exported = Object.keys(projectInfo).filter(
			(key) => key.startsWith("get") && key.endsWith("Dir"),
		);
		const checked = new Set([
			...getters.map(([name]) => name),
			"getCacheDir",
			"getTestResultsDir",
		]);
		expect(exported.filter((name) => !checked.has(name))).toEqual([]);
	});
});

describe("package getters resolve under their declared parent", () => {
	test("every *PkgDir sits directly under packages/ or dev/", () => {
		const pkgGetters = Object.entries(projectInfo).filter(
			(entry): entry is [string, () => string] =>
				entry[0].endsWith("PkgDir") && typeof entry[1] === "function",
		);
		expect(pkgGetters.length).toBeGreaterThan(0);
		for (const [name, getter] of pkgGetters) {
			const parent = path.dirname(getter());
			expect([getPackagesDir(), getDevDir()], name).toContain(parent);
		}
	});

	test("the demo getters sit under demos/", () => {
		expect(path.dirname(getClientExampleServerDir())).toBe(getDemosDir());
		expect(path.dirname(getClientBundleExampleDir())).toBe(getDemosDir());
	});

	test("no two getters resolve to the same directory", () => {
		// A copy-paste slip between two similarly named packages (procaptcha vs
		// procaptcha-common) would otherwise go unnoticed.
		const paths = Object.entries(projectInfo)
			.filter(
				(entry): entry is [string, () => string] =>
					entry[0].startsWith("get") &&
					entry[0].endsWith("Dir") &&
					typeof entry[1] === "function",
			)
			.map(([, getter]) => getter());
		expect(new Set(paths).size).toBe(paths.length);
	});

	test("each package directory name matches its getter name", () => {
		// getProcaptchaPoWPkgDir -> procaptcha-pow. Catches a getter renamed
		// without its path being updated, and vice versa.
		const expected: Record<string, string> = {
			getAccountPkgDir: "account",
			getApiPkgDir: "api",
			getCliPkgDir: "cli",
			getCommonPkgDir: "common",
			getDatabasePkgDir: "database",
			getDatasetsPkgDir: "datasets",
			getDatasetsFsPkgDir: "datasets-fs",
			getDotEnvPkgDir: "dotenv",
			getEnvPkgDir: "env",
			getFileServerPkgDir: "file-server",
			getProcaptchaPkgDir: "procaptcha",
			getProcaptchaBundlePkgDir: "procaptcha-bundle",
			getProcaptchaCommonPkgDir: "procaptcha-common",
			getProcaptchaFrictionlessPkgDir: "procaptcha-frictionless",
			getProcaptchaPoWPkgDir: "procaptcha-pow",
			getProcaptchaReactPkgDir: "procaptcha-react",
			getProviderPkgDir: "provider",
			getServerPkgDir: "server",
			getTypesPkgDir: "types",
			getTypesDatabasePkgDir: "types-database",
			getTypesEnvPkgDir: "types-env",
			getUtilPkgDir: "util",
			getWidgetSkeletonPkgDir: "widget-skeleton",
			getLocalePkgDir: "locale",
			getConfigPkgDir: "config",
			getScriptsPkgDir: "scripts",
		};
		for (const [name, leaf] of Object.entries(expected)) {
			const getter = Reflect.get(projectInfo, name);
			expect(typeof getter, name).toBe("function");
			if (typeof getter === "function") {
				expect(path.basename(String(getter())), name).toBe(leaf);
			}
		}
	});
});

describe("removed getters stay removed", () => {
	// demos/client-example and demos/dapp-example no longer exist. Re-adding a
	// getter for either without the directory would reintroduce a path that
	// silently resolves to nothing.
	test.each(["getClientExampleDir", "getDappExampleDir"])(
		"%s is not exported",
		(name: string) => {
			expect(Object.keys(projectInfo)).not.toContain(name);
		},
	);
});
