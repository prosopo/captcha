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

import type { NextFunction } from "express";

/**
 * A recording stand-in for express's `next`.
 *
 * `vi.fn<NextFunction>()` cannot be passed where a `NextFunction` is wanted —
 * the type is overloaded and Mock collapses it to a single signature — so the
 * spy is a plain closure that records its arguments instead.
 */
interface NextCapture {
	fn: NextFunction;
	calls: unknown[][];
}

const captureNext = (): NextCapture => {
	const calls: unknown[][] = [];
	return {
		fn: (...args: unknown[]): void => {
			calls.push(args);
		},
		calls,
	};
};

export { captureNext, type NextCapture };
