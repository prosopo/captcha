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

import { describe, expect, test } from "vitest";
import { getProcess } from "../process.js";

describe("getProcess", () => {
	// Under vitest there is always a real `process`, so only this arm is
	// directly observable here. The undefined arm is what consumers mock, and
	// i18SharedOptions.unit.test.ts exercises their behaviour against it.
	test("returns the process global when one exists", () => {
		expect(getProcess()).toBe(process);
	});

	test("exposes env, which is the only member consumers use", () => {
		expect(getProcess()?.env).toBe(process.env);
	});

	test("is stable across calls rather than returning a copy", () => {
		expect(getProcess()).toBe(getProcess());
	});
});
