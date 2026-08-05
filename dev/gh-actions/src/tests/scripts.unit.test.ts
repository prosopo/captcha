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

import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test, vi } from "vitest";
import type { FetchTagsDeps } from "../dockerTags.js";
import {
	ENABLE_AUTO_MERGE_MUTATION,
	type EnableAutoMergeDeps,
	type GraphqlFn,
	OWNER,
	PULL_REQUEST_ID_QUERY,
	enableAutoMerge,
} from "../enableAutoMerge.js";
import { isMain } from "../isMain.js";
import { type ListDockerTagsDeps, listDockerTags } from "../listDockerTags.js";
import {
	type PreviousDockerTagDeps,
	previousDockerTag,
} from "../previousDockerTag.js";

const response = (body: unknown): Response =>
	({
		ok: true,
		status: 200,
		statusText: "OK",
		json: (): Promise<unknown> => Promise.resolve(body),
	}) as unknown as Response;

const tagFetch =
	(names: string[]): FetchTagsDeps["fetch"] =>
	(): Promise<Response> =>
		Promise.resolve(
			response({
				next: null,
				results: names.map((name: string) => ({ name })),
			}),
		);

describe("isMain", () => {
	const here = fileURLToPath(import.meta.url);

	test("is true when the module is the script node was given", () => {
		expect(isMain(import.meta.url, ["node", here])).toBe(true);
	});

	test("resolves a relative argv entry before comparing", () => {
		const relative = path.relative(process.cwd(), here);
		expect(isMain(import.meta.url, ["node", relative])).toBe(true);
	});

	test("is false for a different script", () => {
		expect(isMain(import.meta.url, ["node", "/elsewhere/other.ts"])).toBe(
			false,
		);
	});

	test("is false when node was given no script", () => {
		// `node --eval` and the REPL both leave argv[1] unset; without the guard
		// this threw while deciding whether to run main().
		expect(isMain(import.meta.url, ["node"])).toBe(false);
	});

	test("is false for a module url that is not a file", () => {
		expect(isMain("https://example.com/a.js", ["node", here])).toBe(false);
	});

	test("defaults to the real process argv", () => {
		// Under vitest the entrypoint is the runner, never this module — which is
		// what stops the scripts' main() from firing when a test imports them.
		expect(isMain(import.meta.url)).toBe(false);
	});
});

describe("listDockerTags", () => {
	const deps = (names: string[]): ListDockerTagsDeps => ({
		fetch: tagFetch(names),
		log: vi.fn(),
	});

	test("prints and returns the tags", async () => {
		const d = deps(["1.0.0", "2.0.0"]);
		await expect(listDockerTags(["prosopo", "provider"], d)).resolves.toEqual([
			"2.0.0",
			"1.0.0",
		]);
		expect(d.log).toHaveBeenCalledExactlyOnceWith(["2.0.0", "1.0.0"]);
	});

	test("prints an empty list for a repository with no tags", async () => {
		const d = deps([]);
		await expect(listDockerTags(["a", "b"], d)).resolves.toEqual([]);
		expect(d.log).toHaveBeenCalledExactlyOnceWith([]);
	});

	test.each([[[]], [["only-one"]]])(
		"rejects the argument list %j with usage",
		async (args: string[]) => {
			// String(undefined) used to make these a request for a repository
			// literally named "undefined".
			await expect(listDockerTags(args, deps([]))).rejects.toThrow(/usage:/);
		},
	);

	test("ignores extra arguments", async () => {
		await expect(
			listDockerTags(["a", "b", "c"], deps(["1.0.0"])),
		).resolves.toEqual(["1.0.0"]);
	});

	test("does not print when the fetch fails", async () => {
		const log = vi.fn();
		await expect(
			listDockerTags(["a", "b"], {
				fetch: () => Promise.reject(new Error("offline")),
				log,
			}),
		).rejects.toThrow("offline");
		expect(log).not.toHaveBeenCalled();
	});
});

describe("previousDockerTag", () => {
	const deps = (names: string[]): PreviousDockerTagDeps => ({
		fetch: tagFetch(names),
		log: vi.fn(),
	});

	test("prints the newest tag older than the target", async () => {
		const d = deps(["1.0.0", "1.2.0", "2.0.0", "latest"]);
		await expect(
			previousDockerTag(["prosopo", "provider", "2.0.0"], d),
		).resolves.toBe("1.2.0");
		expect(d.log).toHaveBeenCalledExactlyOnceWith("1.2.0");
	});

	test("throws instead of printing nothing when there is no older tag", async () => {
		// Returning silently left `PREV=$(...)` empty in the calling shell, and
		// the caller carried on with an empty tag.
		const d = deps(["2.0.0"]);
		await expect(previousDockerTag(["a", "b", "1.0.0"], d)).rejects.toThrow(
			/no tag older than 1.0.0 in a\/b/,
		);
		expect(d.log).not.toHaveBeenCalled();
	});

	test("throws for an empty repository", async () => {
		await expect(
			previousDockerTag(["a", "b", "1.0.0"], deps([])),
		).rejects.toThrow(/no tag older than/);
	});

	test("rejects a non-semver target", async () => {
		// Comparison would fall back to localeCompare and return an unrelated tag.
		await expect(
			previousDockerTag(["a", "b", "latest"], deps(["1.0.0"])),
		).rejects.toThrow(/not semver: latest/);
	});

	test.each([[[]], [["a"]], [["a", "b"]]])(
		"rejects the argument list %j with usage",
		async (args: string[]) => {
			await expect(previousDockerTag(args, deps([]))).rejects.toThrow(/usage:/);
		},
	);

	test("does not fetch when the target is invalid", async () => {
		// Cheap check first: no point calling Docker Hub to reject the input.
		const fetchSpy = vi.fn(tagFetch([]));
		await expect(
			previousDockerTag(["a", "b", "nope"], { fetch: fetchSpy, log: vi.fn() }),
		).rejects.toThrow(/not semver/);
		expect(fetchSpy).not.toHaveBeenCalled();
	});
});

describe("enableAutoMerge", () => {
	const env = {
		GITHUB_TOKEN: "tok",
		PR_NUMBER: "42",
		REPO: "captcha",
	};

	const graphqlFor = (id: string | null): GraphqlFn =>
		vi.fn((query: string) =>
			Promise.resolve(
				query === PULL_REQUEST_ID_QUERY
					? { repository: { pullRequest: id === null ? null : { id } } }
					: {},
			),
		);

	test("looks the PR up and enables auto-merge for its id", async () => {
		const graphql = graphqlFor("PR_kwid");
		const deps: EnableAutoMergeDeps = { graphql, env };
		await expect(enableAutoMerge(deps)).resolves.toBe("PR_kwid");
		expect(graphql).toHaveBeenNthCalledWith(1, PULL_REQUEST_ID_QUERY, {
			owner: OWNER,
			repo: "captcha",
			number: 42,
			headers: { authorization: "token tok" },
		});
		expect(graphql).toHaveBeenNthCalledWith(2, ENABLE_AUTO_MERGE_MUTATION, {
			pullRequestId: "PR_kwid",
			headers: { authorization: "token tok" },
		});
	});

	test("passes the repo and number as variables, not query text", async () => {
		// Interpolating them emitted the repo name as a bare GraphQL identifier,
		// so any repository with a hyphen in its name was a syntax error rather
		// than a lookup — and an unvalidated PR_NUMBER was spliced into the
		// document.
		const graphql = graphqlFor("id");
		await enableAutoMerge({
			graphql,
			env: { ...env, REPO: "captcha-private" },
		});
		expect(PULL_REQUEST_ID_QUERY).not.toContain("captcha-private");
		expect(PULL_REQUEST_ID_QUERY).toContain("$repo: String!");
		expect(graphql).toHaveBeenNthCalledWith(
			1,
			PULL_REQUEST_ID_QUERY,
			expect.objectContaining({ repo: "captcha-private" }),
		);
	});

	test.each([["GITHUB_TOKEN"], ["PR_NUMBER"], ["REPO"]])(
		"requires %s",
		async (name: string) => {
			const graphql = graphqlFor("id");
			await expect(
				enableAutoMerge({ graphql, env: { ...env, [name]: undefined } }),
			).rejects.toThrow(`${name} env variable not set`);
			expect(graphql).not.toHaveBeenCalled();
		},
	);

	test.each([["GITHUB_TOKEN"], ["PR_NUMBER"], ["REPO"]])(
		"treats an empty %s as unset",
		async (name: string) => {
			// An unpopulated GitHub Actions expression expands to an empty string;
			// the old `=== undefined` check let it through to be interpolated as an
			// empty repo name or a bare `token ` header.
			await expect(
				enableAutoMerge({
					graphql: graphqlFor("id"),
					env: { ...env, [name]: "" },
				}),
			).rejects.toThrow(`${name} env variable not set`);
		},
	);

	test.each([["abc"], ["0"], ["-1"], ["1.5"], ["42abc"], [""]])(
		"rejects a PR_NUMBER of %j",
		async (PR_NUMBER: string) => {
			await expect(
				enableAutoMerge({
					graphql: graphqlFor("id"),
					env: { ...env, PR_NUMBER },
				}),
			).rejects.toThrow(/PR_NUMBER|not set/);
		},
	);

	test("does not mutate when the PR does not exist", async () => {
		// A wrong repo or a missing PR comes back as a null field rather than an
		// error; the old code read `.id` off it and threw a TypeError inside the
		// next query's template.
		const graphql = graphqlFor(null);
		await expect(enableAutoMerge({ graphql, env })).rejects.toThrow(
			"no pull request prosopo/captcha#42",
		);
		expect(graphql).toHaveBeenCalledOnce();
	});

	test.each([
		[{}, "an empty response"],
		[{ repository: null }, "a null repository"],
		[{ repository: { pullRequest: { id: 7 } } }, "a non-string id"],
		[null, "a null body"],
	])("rejects %j (%s)", async (body: unknown, _reason: string) => {
		const graphql: GraphqlFn = vi.fn(() => Promise.resolve(body));
		await expect(enableAutoMerge({ graphql, env })).rejects.toThrow(
			/no pull request/,
		);
	});

	test("propagates a failure from the lookup", async () => {
		const graphql: GraphqlFn = vi.fn(() => Promise.reject(new Error("401")));
		await expect(enableAutoMerge({ graphql, env })).rejects.toThrow("401");
	});

	test("propagates a failure from the mutation", async () => {
		// The common one: auto-merge is not enabled on the repository.
		const graphql: GraphqlFn = vi.fn((query: string) =>
			query === PULL_REQUEST_ID_QUERY
				? Promise.resolve({ repository: { pullRequest: { id: "x" } } })
				: Promise.reject(new Error("Auto-merge is not allowed")),
		);
		await expect(enableAutoMerge({ graphql, env })).rejects.toThrow(
			"Auto-merge is not allowed",
		);
	});

	test("requests a squash merge", () => {
		expect(ENABLE_AUTO_MERGE_MUTATION).toContain("mergeMethod: SQUASH");
	});
});
