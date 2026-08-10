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

// @vitest-environment jsdom

// Covers the branch of src/index.ts taken when the document has already
// finished loading: the script must run straight away rather than waiting for
// DOMContentLoaded. Kept in its own file because the IIFE only evaluates once
// per module instance. The waiting branch is covered by floatLabel.unit.test.ts.

import { describe, expect, it } from "vitest";

describe("float label script — document already loaded", () => {
	it("applies the label state immediately on import", async () => {
		document.body.innerHTML =
			'<div class="mui-textfield--float-label"><label>Email</label><input value="a@test.com" /></div>';
		expect(document.readyState).not.toBe("loading");

		await import("../index.js");

		expect(
			document.querySelector(".mui-textfield--float-label")?.classList,
		).toContain("label-hidden");
	});
});
