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
import { createPathMatcher, normalizeAuthPath } from "../path.js";

describe("normalizeAuthPath", () => {
	it.each([
		["/api/auth/sign-in/email", "/api/auth", "/sign-in/email"],
		["/api/auth//sign-in//email/", "/api/auth", "/sign-in/email"],
		["/api/auth", "/api/auth", "/"],
		["/other/sign-in/email", "/api/auth", "/other/sign-in/email"],
		["/sign-in/email", "", "/sign-in/email"],
	])(
		"%s under %s is %s",
		(pathname: string, basePath: string, expected: string) => {
			expect(normalizeAuthPath(pathname, basePath)).toBe(expected);
		},
	);
});

describe("createPathMatcher", () => {
	it("matches exact paths only when there is no wildcard", () => {
		const matches = createPathMatcher(["/sign-in/email"]);
		expect(matches("/sign-in/email")).toBe(true);
		expect(matches("/sign-in/email/extra")).toBe(false);
		expect(matches("/sign-in/emailx")).toBe(false);
	});

	it("matches one segment with * and any depth with **", () => {
		const single = createPathMatcher(["/sign-in/*"]);
		expect(single("/sign-in/email")).toBe(true);
		expect(single("/sign-in/social/google")).toBe(false);

		const deep = createPathMatcher(["/sign-in/**"]);
		expect(deep("/sign-in")).toBe(true);
		expect(deep("/sign-in/social/google")).toBe(true);
		expect(deep("/sign-up/email")).toBe(false);
	});

	it("matches partial-segment wildcards and ** in the middle", () => {
		const partial = createPathMatcher(["/sign-*/e*l"]);
		expect(partial("/sign-in/email")).toBe(true);
		expect(partial("/sign-up/el")).toBe(true);
		expect(partial("/sign-in/e")).toBe(false);
		expect(partial("/signin/email")).toBe(false);

		const many = createPathMatcher(["/a*b*c"]);
		expect(many("/abc")).toBe(true);
		expect(many("/axxbyyc")).toBe(true);
		expect(many("/abbc")).toBe(true);
		expect(many("/acb")).toBe(false);
		expect(many("/axc")).toBe(false);

		const middle = createPathMatcher(["/**/email"]);
		expect(middle("/email")).toBe(true);
		expect(middle("/sign-in/social/email")).toBe(true);
		expect(middle("/sign-in/email/x")).toBe(false);
	});

	it("treats regex characters in endpoints literally", () => {
		const matches = createPathMatcher(["/a.b/*"]);
		expect(matches("/a.b/c")).toBe(true);
		expect(matches("/axb/c")).toBe(false);
	});
});
