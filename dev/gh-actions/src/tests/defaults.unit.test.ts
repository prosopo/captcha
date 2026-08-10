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

import { afterEach, describe, expect, test, vi } from "vitest";
import { defaultFetchTagsDeps, tagsUrl } from "../dockerTags.js";
import { defaultEnableAutoMergeDeps } from "../enableAutoMerge.js";
import { defaultListDockerTagsDeps } from "../listDockerTags.js";
import { defaultPreviousDockerTagDeps } from "../previousDockerTag.js";

/**
 * The default dependency sets are the only code the injected-fixture tests do
 * not reach, and they are where a wrong global or an unbound method would hide.
 */
describe("default dependencies", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	test("defaultFetchTagsDeps.fetch calls the global fetch with the url", async () => {
		const stub = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue(new Response("{}"));
		await defaultFetchTagsDeps.fetch(tagsUrl("a", "b"));
		expect(stub).toHaveBeenCalledExactlyOnceWith(tagsUrl("a", "b"));
	});

	test("defaultFetchTagsDeps.fetch does not lose the global's this binding", async () => {
		// `fetch: globalThis.fetch` would throw "Illegal invocation" once detached
		// from the global object in some runtimes.
		vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
		const detached = defaultFetchTagsDeps.fetch;
		await expect(detached("https://example.com")).resolves.toBeInstanceOf(
			Response,
		);
	});

	test("defaultListDockerTagsDeps.log writes to the console", () => {
		const stub = vi.spyOn(console, "log").mockImplementation(() => undefined);
		defaultListDockerTagsDeps.log(["1.0.0"]);
		expect(stub).toHaveBeenCalledExactlyOnceWith(["1.0.0"]);
	});

	test("defaultPreviousDockerTagDeps.log writes the bare tag", () => {
		// The output is consumed by `$(...)` in a shell, so it must be the tag
		// alone with nothing around it.
		const stub = vi.spyOn(console, "log").mockImplementation(() => undefined);
		defaultPreviousDockerTagDeps.log("1.2.3");
		expect(stub).toHaveBeenCalledExactlyOnceWith("1.2.3");
	});

	test("both script defaults reuse the shared fetch", () => {
		expect(defaultListDockerTagsDeps.fetch).toBe(defaultFetchTagsDeps.fetch);
		expect(defaultPreviousDockerTagDeps.fetch).toBe(defaultFetchTagsDeps.fetch);
	});

	test("defaultEnableAutoMergeDeps reads the live process environment", () => {
		// Not a snapshot taken at import time: the script is invoked with the
		// variables the workflow sets.
		expect(defaultEnableAutoMergeDeps.env).toBe(process.env);
	});

	test("defaultEnableAutoMergeDeps.graphql is callable", () => {
		expect(typeof defaultEnableAutoMergeDeps.graphql).toBe("function");
	});
});
