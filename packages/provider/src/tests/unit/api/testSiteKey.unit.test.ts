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

import type { Logger } from "@prosopo/logger";
import { ALWAYS_FAIL_SITE_KEY, ALWAYS_PASS_SITE_KEY } from "@prosopo/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	isReservedTestSiteKey,
	resolveTestSiteKeyVerdict,
} from "../../../api/testSiteKey.js";

// A normal, non-reserved site key (a valid substrate address).
const NORMAL_SITE_KEY = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

describe("testSiteKey", () => {
	let mockLogger: Logger;

	beforeEach(() => {
		vi.clearAllMocks();
		mockLogger = {
			error: vi.fn(),
			info: vi.fn(),
			debug: vi.fn(),
			warn: vi.fn(),
		} as unknown as Logger;
	});

	describe("isReservedTestSiteKey", () => {
		it("returns true for the always-pass key", () => {
			expect(isReservedTestSiteKey(ALWAYS_PASS_SITE_KEY)).toBe(true);
		});

		it("returns true for the always-fail key", () => {
			expect(isReservedTestSiteKey(ALWAYS_FAIL_SITE_KEY)).toBe(true);
		});

		it("returns false for a normal site key", () => {
			expect(isReservedTestSiteKey(NORMAL_SITE_KEY)).toBe(false);
		});
	});

	describe("resolveTestSiteKeyVerdict", () => {
		it("forces verified=true for the always-pass key", () => {
			expect(resolveTestSiteKeyVerdict(ALWAYS_PASS_SITE_KEY, mockLogger)).toBe(
				true,
			);
		});

		it("forces verified=false for the always-fail key", () => {
			expect(resolveTestSiteKeyVerdict(ALWAYS_FAIL_SITE_KEY, mockLogger)).toBe(
				false,
			);
		});

		it("returns null for a normal site key", () => {
			expect(resolveTestSiteKeyVerdict(NORMAL_SITE_KEY, mockLogger)).toBeNull();
		});

		it("warns when a reserved key forces a verdict", () => {
			resolveTestSiteKeyVerdict(ALWAYS_PASS_SITE_KEY, mockLogger);
			expect(mockLogger.warn).toHaveBeenCalledTimes(1);
		});

		it("does not warn for a normal site key", () => {
			resolveTestSiteKeyVerdict(NORMAL_SITE_KEY, mockLogger);
			expect(mockLogger.warn).not.toHaveBeenCalled();
		});

		it("works without a logger", () => {
			expect(resolveTestSiteKeyVerdict(ALWAYS_PASS_SITE_KEY)).toBe(true);
			expect(resolveTestSiteKeyVerdict(NORMAL_SITE_KEY)).toBeNull();
		});
	});
});
