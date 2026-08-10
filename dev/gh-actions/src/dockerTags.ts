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

/** One entry of a Docker Hub tag listing. Only `name` is used. */
export interface DockerTag {
	name: string;
}

/**
 * A page of https://hub.docker.com/v2/repositories/{ns}/{repo}/tags/.
 *
 * `results` and `next` sit at the top level of the response body. They used to
 * be read from a `data` property, which this API does not return — so every
 * page threw, the throw was logged and swallowed, and `fetchTags` always
 * resolved to an empty list.
 */
export interface DockerTagPage {
	next: string | null;
	results: DockerTag[];
}

export interface FetchTagsDeps {
	fetch: (url: string) => Promise<Response>;
}

export const defaultFetchTagsDeps: FetchTagsDeps = {
	fetch: (url: string): Promise<Response> => fetch(url),
};

/**
 * Upper bound on pages walked.
 *
 * The loop is driven by a `next` URL supplied by the remote, so a cyclic or
 * unbounded `next` would spin forever inside a CI job. 100 pages is far more
 * tags than any repository here publishes.
 */
export const MAX_TAG_PAGES = 100;

export const tagsUrl = (namespace: string, repository: string): string =>
	`https://hub.docker.com/v2/repositories/${encodeURIComponent(namespace)}/${encodeURIComponent(repository)}/tags/`;

/** Narrow an unknown JSON body to a tag page, or explain why it is not one. */
export const parseTagPage = (body: unknown, url: string): DockerTagPage => {
	if (typeof body !== "object" || body === null) {
		throw new Error(`${url} did not return a JSON object`);
	}
	const { results, next } = body as { results?: unknown; next?: unknown };
	if (!Array.isArray(results)) {
		throw new Error(`${url} returned no 'results' array`);
	}
	const names: DockerTag[] = results.map((entry: unknown, index: number) => {
		const name = (entry as { name?: unknown } | null)?.name;
		if (typeof name !== "string") {
			throw new Error(`${url} returned a tag with no name at index ${index}`);
		}
		return { name };
	});
	if (next !== null && next !== undefined && typeof next !== "string") {
		throw new Error(`${url} returned a non-string 'next'`);
	}
	return { results: names, next: next ?? null };
};

/**
 * Every tag in a Docker Hub repository, newest semver first.
 *
 * Throws rather than returning whatever it managed to collect. The previous
 * behaviour logged and `break`ed, so a 404 for a repository that does not
 * exist, an auth failure, a network drop and a genuinely empty repository were
 * indistinguishable to the caller — and the callers go on to pick a deployment
 * tag from the result.
 */
export async function fetchTags(
	namespace: string,
	repository: string,
	deps: FetchTagsDeps = defaultFetchTagsDeps,
): Promise<string[]> {
	const tags: string[] = [];
	const seen = new Set<string>();
	let nextPageUrl: string | null = tagsUrl(namespace, repository);

	for (let page = 0; nextPageUrl !== null; page++) {
		if (page >= MAX_TAG_PAGES) {
			throw new Error(
				`stopped after ${MAX_TAG_PAGES} pages of tags for ${namespace}/${repository}`,
			);
		}
		if (seen.has(nextPageUrl)) {
			throw new Error(`tag pagination revisited ${nextPageUrl}`);
		}
		seen.add(nextPageUrl);

		const response = await deps.fetch(nextPageUrl);
		if (!response.ok) {
			// Docker Hub answers a missing repository with a 404 whose body has no
			// `results`, which would otherwise surface as a confusing parse error.
			throw new Error(
				`${nextPageUrl} responded ${response.status} ${response.statusText}`,
			);
		}
		const parsed: DockerTagPage = parseTagPage(
			await response.json(),
			nextPageUrl,
		);
		tags.push(...parsed.results.map((tag: DockerTag) => tag.name));
		nextPageUrl = parsed.next;
	}

	tags.sort(semVerLt);

	return tags.reverse();
}

const SEMVER_REGEX = /^(\d+)\.(\d+)\.(\d+)$/;

/**
 * The three numeric components of a tag, or undefined if it is not semver.
 *
 * Matched with the same expression `isSemVer` uses. Splitting on "." and
 * calling parseInt, as this used to, accepted things isSemVer rejects
 * (`"1.2.3 "`) and — worse — produced NaN for a non-numeric part. Every
 * comparison against NaN is false, so `a.b.c` and `1.2.3` compared equal and
 * sorted into whatever order the sort happened to leave them in.
 */
const parseSemVer = (value: string): [number, number, number] | undefined => {
	const match = SEMVER_REGEX.exec(value);
	if (!match) {
		return undefined;
	}
	return [Number(match[1]), Number(match[2]), Number(match[3])];
};

/** Compare two tags, for `Array.prototype.sort`. Non-semver sorts lexically. */
export const semVerLt = (a: string, b: string): number => {
	const aParts = parseSemVer(a);
	const bParts = parseSemVer(b);

	if (!aParts || !bParts) {
		// not semver, so compare lexicographically
		return a.localeCompare(b);
	}

	const [aMajor, aMinor, aPatch] = aParts;
	const [bMajor, bMinor, bPatch] = bParts;
	if (aMajor !== bMajor) {
		return aMajor < bMajor ? -1 : 1;
	}
	if (aMinor !== bMinor) {
		return aMinor < bMinor ? -1 : 1;
	}
	if (aPatch !== bPatch) {
		return aPatch < bPatch ? -1 : 1;
	}
	return 0;
};

export const isSemVer = (tag: string): boolean => {
	return SEMVER_REGEX.test(tag);
};

/**
 * The newest semver tag strictly older than `target`.
 *
 * `tags` is expected in the descending order `fetchTags` returns, so the first
 * match is the nearest predecessor. Returns undefined when there is none — a
 * brand new repository, or a target older than everything published.
 */
export const findPreviousTag = (
	tags: string[],
	target: string,
): string | undefined => {
	for (const tag of tags) {
		if (isSemVer(tag) === false) {
			continue;
		}
		if (semVerLt(tag, target) === -1) {
			return tag;
		}
	}
	return undefined;
};
