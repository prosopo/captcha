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

// Source-level regression tests for every encodeProcaptchaOutput call site in
// the client Manager packages. If a Manager stops setting captchaType (either
// by accident during refactor, or because someone imports a copy of
// encodeProcaptchaOutput and forgets the field), the puzzle-server-verify
// bug comes back — silently. These tests read the shipped source and fail
// fast on that regression.
//
// A source-level assertion is chosen over spy-based Manager tests because the
// Managers are heavy DOM-facing state machines whose real behaviour is
// exercised by their own package tests; the point here is to lock in that the
// mint call carries captchaType, not to re-test the Manager.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

interface MintSite {
	packageName: string;
	relativePath: string;
	expectedCaptchaType: string;
}

// Each entry pins a Manager's encodeProcaptchaOutput call to a specific
// CaptchaType. Update this list when a new Manager is added.
const MINT_SITES: MintSite[] = [
	{
		packageName: "@prosopo/procaptcha-pow",
		relativePath: "../../../procaptcha-pow/src/services/Manager.ts",
		expectedCaptchaType: "CaptchaType.pow",
	},
	{
		packageName: "@prosopo/procaptcha-puzzle",
		relativePath: "../../../procaptcha-puzzle/src/services/Manager.ts",
		expectedCaptchaType: "CaptchaType.puzzle",
	},
	{
		packageName: "@prosopo/procaptcha",
		relativePath: "../../../procaptcha/src/modules/Manager.ts",
		expectedCaptchaType: "CaptchaType.image",
	},
];

const readManagerSource = (relativePath: string): string => {
	const path = join(__dirname, relativePath);
	return readFileSync(path, "utf8");
};

describe("client Manager mint sites — captchaType regression", () => {
	for (const site of MINT_SITES) {
		it(`${site.packageName} passes ${site.expectedCaptchaType} to encodeProcaptchaOutput`, () => {
			const source = readManagerSource(site.relativePath);
			// Sanity: the file must contain both the mint call and the
			// captchaType literal. The literal check is intentionally loose
			// (substring) so refactors that reorder or reformat the object
			// don't cause false positives — the point is to detect deletion.
			expect(source).toContain("encodeProcaptchaOutput");
			expect(source).toContain("[ApiParams.captchaType]:");
			expect(source).toContain(site.expectedCaptchaType);
		});

		it(`${site.packageName} imports CaptchaType from @prosopo/types`, () => {
			const source = readManagerSource(site.relativePath);
			// Guard against a future refactor that renames CaptchaType or
			// imports it from a shadowed local module.
			expect(source).toMatch(/from\s+["']@prosopo\/types["']/);
			expect(source).toContain("CaptchaType");
		});
	}
});
