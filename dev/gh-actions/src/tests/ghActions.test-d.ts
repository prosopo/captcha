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

import { assertType, describe, expectTypeOf, test } from "vitest";
// The package entrypoint, which is now a barrel rather than a script.
import {
	type DockerTag,
	type DockerTagPage,
	type EnableAutoMergeDeps,
	type FetchTagsDeps,
	type GraphqlFn,
	type ListDockerTagsDeps,
	type PreviousDockerTagDeps,
	type PullRequestIdResponse,
	defaultEnableAutoMergeDeps,
	defaultFetchTagsDeps,
	enableAutoMerge,
	fetchTags,
	findPreviousTag,
	isMain,
	isSemVer,
	listDockerTags,
	parseTagPage,
	previousDockerTag,
	semVerLt,
	tagsUrl,
} from "../index.js";

describe("dockerTags", () => {
	test("fetchTags resolves to plain tag names", () => {
		expectTypeOf(fetchTags("a", "b")).toEqualTypeOf<Promise<string[]>>();
	});

	test("fetchTags deps are optional, preserving the two-argument call", () => {
		assertType<Promise<string[]>>(fetchTags("a", "b"));
		assertType<Promise<string[]>>(fetchTags("a", "b", defaultFetchTagsDeps));
	});

	test("FetchTagsDeps.fetch matches the global fetch's return type", () => {
		// Anything narrower would stop `globalThis.fetch` being usable directly.
		expectTypeOf<FetchTagsDeps["fetch"]>().toEqualTypeOf<
			(url: string) => Promise<Response>
		>();
	});

	test("semVerLt is a valid Array.prototype.sort comparator", () => {
		assertType<Parameters<Array<string>["sort"]>[0]>(semVerLt);
		expectTypeOf(semVerLt("1.0.0", "1.0.1")).toEqualTypeOf<number>();
	});

	test("isSemVer is a predicate over strings", () => {
		expectTypeOf(isSemVer).toEqualTypeOf<(tag: string) => boolean>();
	});

	test("findPreviousTag may not find one", () => {
		// The undefined is the point: callers have to decide what to do when a
		// repository has no earlier release.
		expectTypeOf(findPreviousTag([], "1.0.0")).toEqualTypeOf<
			string | undefined
		>();
	});

	test("tagsUrl returns a string", () => {
		expectTypeOf(tagsUrl("a", "b")).toEqualTypeOf<string>();
	});

	test("parseTagPage narrows from unknown", () => {
		// It is fed a parsed JSON body, so its input must accept anything.
		expectTypeOf(parseTagPage).parameter(0).toEqualTypeOf<unknown>();
		expectTypeOf(parseTagPage({}, "u")).toEqualTypeOf<DockerTagPage>();
	});

	test("DockerTagPage.next is nullable — the last page has none", () => {
		expectTypeOf<DockerTagPage["next"]>().toEqualTypeOf<string | null>();
		expectTypeOf<DockerTagPage["results"]>().toEqualTypeOf<DockerTag[]>();
		assertType<DockerTagPage>({ next: null, results: [{ name: "1.0.0" }] });
	});
});

describe("scripts", () => {
	test("take an argument list, not a spread", () => {
		expectTypeOf(listDockerTags).parameter(0).toEqualTypeOf<string[]>();
		expectTypeOf(previousDockerTag).parameter(0).toEqualTypeOf<string[]>();
	});

	test("previousDockerTag resolves to the tag, never undefined", () => {
		// It throws when there is none, so callers do not have to check.
		expectTypeOf(previousDockerTag([])).toEqualTypeOf<Promise<string>>();
	});

	test("listDockerTags resolves to the tags it printed", () => {
		expectTypeOf(listDockerTags([])).toEqualTypeOf<Promise<string[]>>();
	});

	test("script deps extend the fetch seam", () => {
		expectTypeOf<ListDockerTagsDeps>().toMatchTypeOf<FetchTagsDeps>();
		expectTypeOf<PreviousDockerTagDeps>().toMatchTypeOf<FetchTagsDeps>();
	});

	test("previousDockerTag logs a bare string, not an arbitrary value", () => {
		// Its output is captured by a shell, so it must be one tag.
		expectTypeOf<PreviousDockerTagDeps["log"]>().toEqualTypeOf<
			(value: string) => void
		>();
		expectTypeOf<ListDockerTagsDeps["log"]>().toEqualTypeOf<
			(value: unknown) => void
		>();
	});

	test("reject a partial dependency set", () => {
		// @ts-expect-error missing log
		listDockerTags([], { fetch: () => Promise.resolve(new Response()) });
	});
});

describe("enableAutoMerge", () => {
	test("resolves to the pull request id", () => {
		expectTypeOf(enableAutoMerge()).toEqualTypeOf<Promise<string>>();
	});

	test("deps are optional", () => {
		assertType<Promise<string>>(enableAutoMerge());
		assertType<Promise<string>>(enableAutoMerge(defaultEnableAutoMergeDeps));
	});

	test("env is a string map with optional values, like process.env", () => {
		expectTypeOf<EnableAutoMergeDeps["env"]>().toEqualTypeOf<
			Record<string, string | undefined>
		>();
		assertType<EnableAutoMergeDeps["env"]>(process.env);
	});

	test("GraphqlFn takes variables as a second argument", () => {
		// The signature is what forces the query to be parameterised rather than
		// interpolated.
		expectTypeOf<GraphqlFn>()
			.parameter(1)
			.toEqualTypeOf<Record<string, unknown>>();
		expectTypeOf<GraphqlFn>().returns.toEqualTypeOf<Promise<unknown>>();
	});

	test("the graphql response is narrowed, not any", () => {
		expectTypeOf<PullRequestIdResponse>().not.toBeAny();
		expectTypeOf<PullRequestIdResponse["repository"]>().toEqualTypeOf<{
			pullRequest: { id: string } | null;
		} | null>();
		// A missing PR comes back as null rather than an error, so both levels
		// must be nullable or the check for it is unreachable in the type system.
		assertType<PullRequestIdResponse>({ repository: null });
		assertType<PullRequestIdResponse>({ repository: { pullRequest: null } });
	});
});

describe("isMain", () => {
	test("takes a module url and an optional argv", () => {
		expectTypeOf(isMain("file:///a.js")).toEqualTypeOf<boolean>();
		assertType<boolean>(isMain("file:///a.js", ["node", "/a.js"]));
	});
});
