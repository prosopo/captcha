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

/** Test types a file can declare as `name.<type>.test.ts`. */
export const KNOWN_TEST_TYPES: readonly string[] = ["unit", "integration"];

const TEST_FILE_SUFFIX =
	"@(test|spec).@(mts|cts|mjs|cjs|js|ts|tsx|jsx)" as const;

export interface TestFileGlobs {
	include: string[];
	exclude: string[];
}

export const parseTestTypes = (testTypeEnv: string | undefined): string[] =>
	(testTypeEnv ?? "")
		.split(",")
		.map((t) => t.trim())
		.filter((t) => t.length > 0);

/**
 * Globs selecting the test files for a `TEST_TYPE` filter.
 *
 * Filtering works by excluding the *other* known types rather than by
 * including only the selected one. Files with no declared type
 * (`foo.test.ts`) therefore run under every filter: we don't know what kind
 * of test they are, and an include-only glob silently dropped them from
 * packages whose `test` script sets `TEST_TYPE`.
 */
export const testFileGlobs = (
	testTypeEnv: string | undefined,
): TestFileGlobs => {
	const include = [`src/**/*.${TEST_FILE_SUFFIX}`];
	const selected = parseTestTypes(testTypeEnv);
	if (selected.length === 0) {
		return { include, exclude: [] };
	}
	const excluded = KNOWN_TEST_TYPES.filter((t) => !selected.includes(t));
	return {
		include,
		exclude:
			excluded.length > 0
				? [`src/**/*.@(${excluded.join("|")}).${TEST_FILE_SUFFIX}`]
				: [],
	};
};
