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
import {
	type FetchTagsDeps,
	defaultFetchTagsDeps,
	fetchTags,
	findPreviousTag,
	isSemVer,
} from "./dockerTags.js";
import { isMain } from "./isMain.js";

export interface PreviousDockerTagDeps extends FetchTagsDeps {
	log: (value: string) => void;
}

export const defaultPreviousDockerTagDeps: PreviousDockerTagDeps = {
	...defaultFetchTagsDeps,
	log: (value: string): void => console.log(value),
};

/**
 * Print the newest published tag older than `target`.
 *
 * Throws when there is no such tag. It previously returned having printed
 * nothing, so a caller doing `PREV=$(npm run previousDockerTag ...)` got an
 * empty string and carried on — deploying or diffing against nothing.
 */
export const previousDockerTag = async (
	args: string[],
	deps: PreviousDockerTagDeps = defaultPreviousDockerTagDeps,
): Promise<string> => {
	const [namespace, repository, target] = args;
	if (
		namespace === undefined ||
		repository === undefined ||
		target === undefined
	) {
		throw new Error("usage: previousDockerTag <namespace> <repository> <tag>");
	}
	if (!isSemVer(target)) {
		// Comparing against a non-semver target falls back to a lexicographic
		// comparison, which would silently return an unrelated tag.
		throw new Error(`target tag is not semver: ${target}`);
	}
	// tags will be sorted in descending order
	const tags = await fetchTags(namespace, repository, deps);
	const previous = findPreviousTag(tags, target);
	if (previous === undefined) {
		throw new Error(
			`no tag older than ${target} in ${namespace}/${repository}`,
		);
	}
	deps.log(previous);
	return previous;
};

if (isMain(import.meta.url)) {
	// Deliberately not awaited: a top-level await cannot be emitted into
	// the cjs bundle, so the failure is reported here instead.
	void previousDockerTag(process.argv.slice(2)).catch((error: unknown) => {
		process.exitCode = 1;
		console.error(error);
	});
}
