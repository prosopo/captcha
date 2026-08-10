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

/**
 * The `process` global, or undefined where there is none.
 *
 * This package is reached transitively from browser bundles, where `process`
 * may be missing entirely or present but stripped down. A bare `process.env`
 * read throws a ReferenceError in that case and takes the whole page down.
 *
 * It is a function, and it lives in its own module, so callers can be tested
 * against a runtime that has no `process` at all. Inlining the `typeof` check
 * at the point of use makes that branch untestable: vitest calls
 * `process.memoryUsage()` between suites, so stubbing the real global away
 * fails the run rather than the module under test.
 */
export const getProcess = (): NodeJS.Process | undefined =>
	typeof process !== "undefined" ? process : undefined;
