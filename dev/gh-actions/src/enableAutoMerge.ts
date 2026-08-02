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
import { graphql } from "@octokit/graphql";
import { isMain } from "./isMain.js";

export const OWNER = "prosopo";

/**
 * The shape of the pull request lookup. Previously read off an `any`, so a
 * response that carried GraphQL errors instead of data failed as
 * `Cannot read properties of undefined` inside the next query's template.
 */
export interface PullRequestIdResponse {
	repository: {
		pullRequest: {
			id: string;
		} | null;
	} | null;
}

/**
 * The subset of `@octokit/graphql` this module uses.
 *
 * Typed as taking variables rather than a fully-interpolated query — see
 * `enableAutoMerge`.
 */
export type GraphqlFn = (
	query: string,
	parameters: Record<string, unknown>,
) => Promise<unknown>;

export interface EnableAutoMergeDeps {
	graphql: GraphqlFn;
	env: Record<string, string | undefined>;
}

export const defaultEnableAutoMergeDeps: EnableAutoMergeDeps = {
	// Referenced rather than wrapped: octokit's `graphql` is already the shape
	// GraphqlFn describes, and a wrapper arrow would be a line no in-process
	// test can reach without making a real request.
	graphql,
	env: process.env,
};

// The repository and PR number arrive as GraphQL variables rather than being
// interpolated into the document. Interpolating them meant the repository name
// was emitted as a bare identifier, so any repo whose name is not a valid
// GraphQL name — anything with a hyphen, which is most of them — produced a
// syntax error rather than a lookup; and an unvalidated PR_NUMBER was spliced
// straight into the query text.
export const PULL_REQUEST_ID_QUERY = `
	query pullRequestId($owner: String!, $repo: String!, $number: Int!) {
		repository(owner: $owner, name: $repo) {
			pullRequest(number: $number) {
				id
			}
		}
	}
`;

export const ENABLE_AUTO_MERGE_MUTATION = `
	mutation enableAutoMerge($pullRequestId: ID!) {
		enablePullRequestAutoMerge(input: {
			pullRequestId: $pullRequestId,
			mergeMethod: SQUASH
		}) {
			pullRequest {
				id
			}
		}
	}
`;

const required = (
	env: Record<string, string | undefined>,
	name: string,
): string => {
	const value = env[name];
	if (value === undefined || value === "") {
		// An empty string is treated as unset: an unpopulated GitHub Actions
		// expression expands to one, and the previous `=== undefined` check let it
		// through to be interpolated as an empty repo name or token.
		throw new Error(`${name} env variable not set`);
	}
	return value;
};

/** Turn on squash auto-merge for the PR named by the environment. */
export const enableAutoMerge = async (
	deps: EnableAutoMergeDeps = defaultEnableAutoMergeDeps,
): Promise<string> => {
	const token = required(deps.env, "GITHUB_TOKEN");
	const prNumber = required(deps.env, "PR_NUMBER");
	const repo = required(deps.env, "REPO");

	const number = Number(prNumber);
	if (!Number.isInteger(number) || number <= 0) {
		throw new Error(`PR_NUMBER is not a positive integer: ${prNumber}`);
	}

	const headers = { authorization: `token ${token}` };

	const response = (await deps.graphql(PULL_REQUEST_ID_QUERY, {
		owner: OWNER,
		repo,
		number,
		headers,
	})) as PullRequestIdResponse;

	const id = response?.repository?.pullRequest?.id;
	if (typeof id !== "string") {
		// A wrong repo name or a PR number that does not exist comes back as a
		// null field rather than an error, so this is the first place it can be
		// noticed.
		throw new Error(`no pull request ${OWNER}/${repo}#${number}`);
	}

	await deps.graphql(ENABLE_AUTO_MERGE_MUTATION, {
		pullRequestId: id,
		headers,
	});

	return id;
};

if (isMain(import.meta.url)) {
	// Deliberately not awaited: a top-level await cannot be emitted into
	// the cjs bundle, so the failure is reported here instead.
	void enableAutoMerge().catch((error: unknown) => {
		process.exitCode = 1;
		console.error(error);
	});
}
