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
import { describe, expect, it } from "vitest";
import { isMain } from "../isMain.js";

describe("isMain", () => {
	it("returns false for non-main module with string", () => {
		const result = isMain("file:///some/path/to/file.ts");
		expect(result).toBe(false);
	});

	it("returns false for non-main module with different path", () => {
		const result = isMain("file:///different/path.ts");
		expect(result).toBe(false);
	});
});
