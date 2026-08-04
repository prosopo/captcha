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
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import VitePluginRemoveUnusedTranslations from "./vite-plugin-remove-unused-translations.js";

let root: string;
let cwd: string;

beforeEach(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), "prosopo-translations-test-"));
	cwd = process.cwd();
	process.chdir(root);
});

afterEach(() => {
	process.chdir(cwd);
	fs.rmSync(root, { recursive: true, force: true });
});

/** Vite plugin hooks may be a bare function or an object with a `handler`. */
type Hook<A extends unknown[], R> =
	| ((...args: A) => R)
	| { handler: (...args: A) => R }
	| undefined;

const callHook = <A extends unknown[], R>(hook: Hook<A, R>, ...args: A): R => {
	if (!hook) {
		throw new Error("plugin does not define the hook");
	}
	const handler = typeof hook === "function" ? hook : hook.handler;
	return handler(...args);
};

const writeJson = (name: string, data: unknown): string => {
	const filePath = path.join(root, name);
	fs.writeFileSync(filePath, JSON.stringify(data));
	return filePath;
};

const readJson = (filePath: string): unknown =>
	JSON.parse(fs.readFileSync(filePath, "utf-8"));

const run = async (
	keys: string[],
	sources: string[],
	pattern: string,
): Promise<void> => {
	const plugin = VitePluginRemoveUnusedTranslations(keys, pattern);
	for (const source of sources) {
		callHook(plugin.transform, source, "id.ts");
	}
	await callHook(plugin.writeBundle);
};

describe("VitePluginRemoveUnusedTranslations", () => {
	it("runs after the other plugins, once the code is final", () => {
		expect(VitePluginRemoveUnusedTranslations([], "*.json").enforce).toBe(
			"post",
		);
	});

	it("returns the code it was given, unmodified", () => {
		const plugin = VitePluginRemoveUnusedTranslations(["zz"], "*.json");
		expect(callHook(plugin.transform, "uses zz", "id.ts")).toEqual({
			code: "uses zz",
		});
	});

	// The set of used keys lives at module scope, shared by every plugin
	// instance in the process, so each test below uses key names of its own.

	it("keeps only the keys the bundle actually references", async () => {
		const file = writeJson("en.json", { kept: "yes", dropped: "no" });
		await run(["kept", "dropped"], ["t('kept')"], `${root}/*.json`);
		expect(readJson(file)).toEqual({ kept: "yes" });
	});

	it("restores the nesting of the keys it keeps", async () => {
		const file = writeJson("en.json", {
			widget: { label: "Verify", hint: "Click" },
		});
		await run(
			["widget.label", "widget.hint"],
			["t('widget.label')"],
			`${root}/*.json`,
		);
		expect(readJson(file)).toEqual({ widget: { label: "Verify" } });
	});

	it("empties a file whose keys are all unused", async () => {
		const file = writeJson("en.json", { solo: "1" });
		await run(["solo"], ["nothing here"], `${root}/*.json`);
		expect(readJson(file)).toEqual({});
	});

	it("prunes every matching file", async () => {
		const en = writeJson("en.json", { pa: "en", pb: "en" });
		const fr = writeJson("fr.json", { pa: "fr", pb: "fr" });
		await run(["pa", "pb"], ["t('pa')"], `${root}/*.json`);
		expect(readJson(en)).toEqual({ pa: "en" });
		expect(readJson(fr)).toEqual({ pa: "fr" });
	});

	it("does nothing when the pattern matches no file", async () => {
		await expect(
			run(["nk"], ["t('nk')"], `${root}/none/*.json`),
		).resolves.toBeUndefined();
	});

	it("leaves a malformed JSON file alone instead of failing the build", async () => {
		// A translation file is not worth aborting a release for; the bundle is
		// already written by the time this hook runs.
		const broken = path.join(root, "en.json");
		fs.writeFileSync(broken, "{ not json");
		await expect(
			run(["mk"], ["t('mk')"], `${root}/*.json`),
		).resolves.toBeUndefined();
		expect(fs.readFileSync(broken, "utf-8")).toBe("{ not json");
	});

	it("declares no key used when the key list is empty", async () => {
		const file = writeJson("en.json", { ek: "1" });
		await run([], ["t('ek')"], `${root}/*.json`);
		expect(readJson(file)).toEqual({});
	});

	it("matches a key as a substring of the emitted code", async () => {
		// The keys are looked for with `includes`, not as whole tokens, so a key
		// that is a prefix of another is kept whenever the longer one is used.
		const file = writeJson("en.json", { sa: "1", sab: "2" });
		await run(["sa", "sab"], ["t('sab')"], `${root}/*.json`);
		expect(readJson(file)).toEqual({ sa: "1", sab: "2" });
	});

	it("accumulates used keys across every transformed module", async () => {
		const file = writeJson("en.json", { one: "1", two: "2", three: "3" });
		await run(
			["one", "two", "three"],
			["t('one')", "t('two')"],
			`${root}/*.json`,
		);
		expect(readJson(file)).toEqual({ one: "1", two: "2" });
	});
});
