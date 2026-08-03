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
import {
	ALWAYS_FAIL_SITE_KEY,
	ALWAYS_PASS_SITE_KEY,
	TestSiteKeyMode,
	getTestSiteKeyMode,
} from "./testSiteKeys.js";

describe("reserved test site keys", () => {
	it("are distinct", () => {
		expect(ALWAYS_PASS_SITE_KEY).not.toBe(ALWAYS_FAIL_SITE_KEY);
	});

	it("are 48 character ss58 addresses, like any other site key", () => {
		expect(ALWAYS_PASS_SITE_KEY).toHaveLength(48);
		expect(ALWAYS_FAIL_SITE_KEY).toHaveLength(48);
	});
});

describe("getTestSiteKeyMode", () => {
	it("forces a pass for the always-pass key", () => {
		expect(getTestSiteKeyMode(ALWAYS_PASS_SITE_KEY)).toBe(TestSiteKeyMode.Pass);
	});

	it("forces a fail for the always-fail key", () => {
		expect(getTestSiteKeyMode(ALWAYS_FAIL_SITE_KEY)).toBe(TestSiteKeyMode.Fail);
	});

	it("returns null for a normal site key", () => {
		expect(
			getTestSiteKeyMode("5C7bfXYwachNuvmasEFtWi9BMS41uBvo6KpYHVSQmad4nWzw"),
		).toBeNull();
	});

	it("returns null for an empty site key", () => {
		expect(getTestSiteKeyMode("")).toBeNull();
	});

	it("matches exactly, not by prefix", () => {
		expect(getTestSiteKeyMode(ALWAYS_PASS_SITE_KEY.slice(0, 47))).toBeNull();
		expect(getTestSiteKeyMode(`${ALWAYS_PASS_SITE_KEY}x`)).toBeNull();
	});

	it("is case sensitive, as ss58 addresses are", () => {
		expect(getTestSiteKeyMode(ALWAYS_PASS_SITE_KEY.toLowerCase())).toBeNull();
	});
});
