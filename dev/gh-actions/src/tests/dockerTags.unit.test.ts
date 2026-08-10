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

import { describe, expect, test, vi } from "vitest";
import {
	type FetchTagsDeps,
	MAX_TAG_PAGES,
	fetchTags,
	findPreviousTag,
	isSemVer,
	parseTagPage,
	semVerLt,
	tagsUrl,
} from "../dockerTags.js";

/** A Response stand-in exposing only what fetchTags reads. */
const response = (
	body: unknown,
	init: { ok?: boolean; status?: number; statusText?: string } = {},
): Response =>
	({
		ok: init.ok ?? true,
		status: init.status ?? 200,
		statusText: init.statusText ?? "OK",
		json: (): Promise<unknown> => Promise.resolve(body),
	}) as unknown as Response;

const page = (names: string[], next: string | null = null): unknown => ({
	count: names.length,
	next,
	previous: null,
	results: names.map((name: string) => ({ name, id: 1 })),
});

const depsFor = (pages: Record<string, unknown>): FetchTagsDeps => ({
	fetch: (url: string): Promise<Response> => {
		const body = pages[url];
		if (body === undefined) {
			return Promise.reject(new Error(`unexpected fetch of ${url}`));
		}
		return Promise.resolve(response(body));
	},
});

describe("tagsUrl", () => {
	test("builds the v2 tags endpoint", () => {
		expect(tagsUrl("prosopo", "provider")).toBe(
			"https://hub.docker.com/v2/repositories/prosopo/provider/tags/",
		);
	});

	test("encodes the path segments", () => {
		// A namespace containing a slash would otherwise change which endpoint is
		// addressed rather than 404.
		expect(tagsUrl("a/b", "c?d")).toBe(
			"https://hub.docker.com/v2/repositories/a%2Fb/c%3Fd/tags/",
		);
	});
});

describe("parseTagPage", () => {
	test("reads results and next from the top level of the body", () => {
		// The defect this pins: these were read from a `data` property that the
		// Docker Hub API does not return, so every page threw.
		expect(parseTagPage(page(["1.0.0"], "next-url"), "u")).toEqual({
			results: [{ name: "1.0.0" }],
			next: "next-url",
		});
	});

	test("treats a missing next as the last page", () => {
		expect(parseTagPage({ results: [] }, "u").next).toBeNull();
	});

	test("accepts an empty results array", () => {
		expect(parseTagPage(page([]), "u").results).toEqual([]);
	});

	test.each([[null], ["a string"], [42], [undefined]])(
		"rejects a body of %j",
		(body: unknown) => {
			expect(() => parseTagPage(body, "u")).toThrow(
				/did not return a JSON object/,
			);
		},
	);

	test("rejects a body with no results array", () => {
		expect(() => parseTagPage({ next: null }, "u")).toThrow(
			/returned no 'results' array/,
		);
		expect(() => parseTagPage({ results: "1.0.0" }, "u")).toThrow(
			/returned no 'results' array/,
		);
	});

	test("names the index of a result with no name", () => {
		expect(() => parseTagPage({ results: [{ name: "a" }, {}] }, "u")).toThrow(
			/no name at index 1/,
		);
		expect(() => parseTagPage({ results: [null] }, "u")).toThrow(
			/no name at index 0/,
		);
		expect(() => parseTagPage({ results: [{ name: 7 }] }, "u")).toThrow(
			/no name at index 0/,
		);
	});

	test("rejects a non-string next", () => {
		expect(() => parseTagPage({ results: [], next: 3 }, "u")).toThrow(
			/non-string 'next'/,
		);
	});
});

describe("fetchTags", () => {
	const url = tagsUrl("prosopo", "provider");

	test("returns tags newest first", async () => {
		const deps = depsFor({ [url]: page(["1.0.0", "1.10.0", "1.2.0"]) });
		await expect(fetchTags("prosopo", "provider", deps)).resolves.toEqual([
			"1.10.0",
			"1.2.0",
			"1.0.0",
		]);
	});

	test("follows pagination and concatenates the pages", async () => {
		const deps = depsFor({
			[url]: page(["1.0.0"], "page2"),
			page2: page(["2.0.0"], "page3"),
			page3: page(["1.5.0"]),
		});
		await expect(fetchTags("prosopo", "provider", deps)).resolves.toEqual([
			"2.0.0",
			"1.5.0",
			"1.0.0",
		]);
	});

	test("returns an empty list for a repository with no tags", async () => {
		const deps = depsFor({ [url]: page([]) });
		await expect(fetchTags("prosopo", "provider", deps)).resolves.toEqual([]);
	});

	test("throws on a non-ok response instead of returning an empty list", async () => {
		// The old code logged and broke out of the loop, so a 404 for a
		// repository that does not exist was indistinguishable from an empty one
		// — and callers pick a deployment tag from the result.
		const deps: FetchTagsDeps = {
			fetch: () =>
				Promise.resolve(
					response({}, { ok: false, status: 404, statusText: "Not Found" }),
				),
		};
		await expect(fetchTags("prosopo", "nope", deps)).rejects.toThrow(
			/responded 404 Not Found/,
		);
	});

	test("propagates a network failure", async () => {
		const deps: FetchTagsDeps = {
			fetch: () => Promise.reject(new Error("ECONNRESET")),
		};
		await expect(fetchTags("prosopo", "provider", deps)).rejects.toThrow(
			"ECONNRESET",
		);
	});

	test("propagates a malformed page", async () => {
		const deps = depsFor({ [url]: { unexpected: true } });
		await expect(fetchTags("prosopo", "provider", deps)).rejects.toThrow(
			/returned no 'results' array/,
		);
	});

	test("propagates a body that is not JSON", async () => {
		const deps: FetchTagsDeps = {
			fetch: () =>
				Promise.resolve({
					ok: true,
					status: 200,
					statusText: "OK",
					json: (): Promise<unknown> =>
						Promise.reject(new SyntaxError("bad json")),
				} as unknown as Response),
		};
		await expect(fetchTags("prosopo", "provider", deps)).rejects.toThrow(
			"bad json",
		);
	});

	test("stops rather than looping forever on a self-referential next", async () => {
		const deps = depsFor({ [url]: page(["1.0.0"], url) });
		await expect(fetchTags("prosopo", "provider", deps)).rejects.toThrow(
			/revisited/,
		);
	});

	test("stops rather than looping forever on an ever-changing next", async () => {
		let index = 0;
		const deps: FetchTagsDeps = {
			fetch: () => {
				index++;
				return Promise.resolve(
					response(page([`0.0.${index}`], `page${index}`)),
				);
			},
		};
		await expect(fetchTags("prosopo", "provider", deps)).rejects.toThrow(
			new RegExp(`stopped after ${MAX_TAG_PAGES} pages`),
		);
		expect(index).toBe(MAX_TAG_PAGES);
	});

	test("requests the endpoint for the given namespace and repository", async () => {
		const fetchSpy = vi.fn(
			(_url: string): Promise<Response> => Promise.resolve(response(page([]))),
		);
		await fetchTags("ns", "repo", { fetch: fetchSpy });
		expect(fetchSpy).toHaveBeenCalledExactlyOnceWith(tagsUrl("ns", "repo"));
	});
});

describe("semVerLt", () => {
	test.each([
		["1.0.0", "1.0.1", -1],
		["1.0.1", "1.0.0", 1],
		["1.0.0", "1.1.0", -1],
		["1.0.0", "2.0.0", -1],
		["1.0.0", "1.0.0", 0],
	])("compares %s to %s as %d", (a: string, b: string, expected: number) => {
		expect(semVerLt(a, b)).toBe(expected);
	});

	test("compares numerically, not lexically", () => {
		// The reason this function exists rather than a plain string sort.
		expect(semVerLt("1.9.0", "1.10.0")).toBe(-1);
		expect(semVerLt("9.0.0", "10.0.0")).toBe(-1);
	});

	test("treats leading zeroes as the same number", () => {
		expect(semVerLt("1.02.0", "1.2.0")).toBe(0);
	});

	test("does not report two different non-numeric tags as equal", () => {
		// Splitting and parseInt-ing gave NaN for each part; every comparison
		// against NaN is false, so the loop fell through to 0 and the sort left
		// them in an arbitrary order.
		expect(semVerLt("a.b.c", "1.2.3")).not.toBe(0);
		expect(semVerLt("latest", "1.2.3")).not.toBe(0);
	});

	test("falls back to a lexicographic comparison for non-semver tags", () => {
		expect(semVerLt("alpha", "beta")).toBe("alpha".localeCompare("beta"));
		expect(semVerLt("1.0", "1.0.0")).toBe("1.0".localeCompare("1.0.0"));
		expect(semVerLt("1.0.0.1", "1.0.0")).toBe("1.0.0.1".localeCompare("1.0.0"));
	});

	test("treats a tag with surrounding whitespace as non-semver", () => {
		// parseInt("3 ") is 3, so this used to be compared numerically while
		// isSemVer rejected it — the two disagreed about the same string.
		expect(isSemVer("1.2.3 ")).toBe(false);
		expect(semVerLt("1.2.3 ", "1.2.4")).toBe("1.2.3 ".localeCompare("1.2.4"));
	});

	test("is a valid comparator: sorting is stable and total", () => {
		const tags = ["1.10.0", "latest", "1.2.0", "2.0.0", "1.2.0"];
		expect([...tags].sort(semVerLt)).toEqual([...tags].sort(semVerLt));
	});

	test("sorts a mixed list ascending", () => {
		expect(["2.0.0", "1.0.0", "1.10.0", "1.9.0"].sort(semVerLt)).toEqual([
			"1.0.0",
			"1.9.0",
			"1.10.0",
			"2.0.0",
		]);
	});
});

describe("isSemVer", () => {
	test.each([["1.0.0"], ["0.0.0"], ["10.20.30"], ["01.2.3"]])(
		"accepts %s",
		(tag: string) => {
			expect(isSemVer(tag)).toBe(true);
		},
	);

	test.each([
		[""],
		["latest"],
		["1.0"],
		["1.0.0.0"],
		["v1.0.0"],
		["1.0.0-rc1"],
		["1.0.0 "],
		[" 1.0.0"],
		["1.0.0\n"],
	])("rejects %j", (tag: string) => {
		expect(isSemVer(tag)).toBe(false);
	});

	test("is not stateful across calls", () => {
		// A /g regex would alternate true/false on the same input via lastIndex.
		expect(isSemVer("1.0.0")).toBe(true);
		expect(isSemVer("1.0.0")).toBe(true);
	});
});

describe("findPreviousTag", () => {
	const descending = ["2.0.0", "1.10.0", "latest", "1.2.0", "1.0.0"];

	test("returns the newest tag older than the target", () => {
		expect(findPreviousTag(descending, "1.10.0")).toBe("1.2.0");
	});

	test("skips non-semver tags", () => {
		expect(findPreviousTag(descending, "1.2.0")).toBe("1.0.0");
	});

	test("ignores tags newer than the target", () => {
		expect(findPreviousTag(descending, "2.0.0")).toBe("1.10.0");
	});

	test("does not return the target itself", () => {
		expect(findPreviousTag(["1.0.0"], "1.0.0")).toBeUndefined();
	});

	test("returns undefined when nothing is older", () => {
		expect(findPreviousTag(descending, "0.0.1")).toBeUndefined();
	});

	test("returns undefined for an empty list", () => {
		expect(findPreviousTag([], "1.0.0")).toBeUndefined();
	});

	test("returns undefined when every tag is non-semver", () => {
		expect(findPreviousTag(["latest", "edge"], "1.0.0")).toBeUndefined();
	});

	test("finds a target between two published tags", () => {
		expect(findPreviousTag(["2.0.0", "1.0.0"], "1.5.0")).toBe("1.0.0");
	});
});
