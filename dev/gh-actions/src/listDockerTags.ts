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
} from "./dockerTags.js";
import { isMain } from "./isMain.js";

export interface ListDockerTagsDeps extends FetchTagsDeps {
	log: (value: unknown) => void;
}

export const defaultListDockerTagsDeps: ListDockerTagsDeps = {
	...defaultFetchTagsDeps,
	log: (value: unknown): void => console.log(value),
};

/**
 * Print every tag of a Docker Hub repository.
 *
 * `args` is the argument list after the script name. Missing arguments used to
 * be passed through `String(...)`, which turned them into the literal string
 * "undefined" and produced a request for a repository of that name — a 404 the
 * old error handling then swallowed into an empty list.
 */
export const listDockerTags = async (
	args: string[],
	deps: ListDockerTagsDeps = defaultListDockerTagsDeps,
): Promise<string[]> => {
	const [namespace, repository] = args;
	if (namespace === undefined || repository === undefined) {
		throw new Error("usage: listDockerTags <namespace> <repository>");
	}
	const tags = await fetchTags(namespace, repository, deps);
	deps.log(tags);
	return tags;
};

if (isMain(import.meta.url)) {
	// Deliberately not awaited: a top-level await cannot be emitted into
	// the cjs bundle, so the failure is reported here instead.
	void listDockerTags(process.argv.slice(2)).catch((error: unknown) => {
		process.exitCode = 1;
		console.error(error);
	});
}
