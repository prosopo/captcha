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

import { ApiParams, CaptchaType, POW_SEPARATOR } from "@prosopo/types";
import { describe, expect, it } from "vitest";
import {
	buildFrictionlessMaintenanceResponse,
	buildPowMaintenanceResponse,
	buildPuzzleMaintenanceResponse,
} from "../../../../api/captcha/maintenanceModeResponses.js";

describe("maintenanceModeResponses", () => {
	describe("buildFrictionlessMaintenanceResponse", () => {
		it("returns ok with the requested captchaType and a fresh sessionId", () => {
			const r = buildFrictionlessMaintenanceResponse(
				CaptchaType.pow,
				"localhost:9229",
			);
			expect(r[ApiParams.status]).toBe("ok");
			expect(r[ApiParams.captchaType]).toBe(CaptchaType.pow);
			expect(typeof r[ApiParams.sessionId]).toBe("string");
			expect(r[ApiParams.sessionId]).toContain("localhost:9229-");
		});

		it("strips the `.prosopo.io` suffix from the session prefix", () => {
			const r = buildFrictionlessMaintenanceResponse(
				CaptchaType.puzzle,
				"foo.prosopo.io",
			);
			expect(r[ApiParams.sessionId]?.startsWith("foo-")).toBe(true);
			expect(r[ApiParams.sessionId]?.includes(".prosopo.io")).toBe(false);
		});

		it("falls back to `local` when host is undefined", () => {
			const r = buildFrictionlessMaintenanceResponse(
				CaptchaType.image,
				undefined,
			);
			expect(r[ApiParams.sessionId]?.startsWith("local-")).toBe(true);
		});

		it("issues distinct sessionIds across calls", () => {
			const a = buildFrictionlessMaintenanceResponse(CaptchaType.pow, "h");
			const b = buildFrictionlessMaintenanceResponse(CaptchaType.pow, "h");
			expect(a[ApiParams.sessionId]).not.toEqual(b[ApiParams.sessionId]);
		});
	});

	describe("buildPowMaintenanceResponse", () => {
		it("returns a shape valid against PowChallengeIdSchema (4 parts)", () => {
			const r = buildPowMaintenanceResponse("user-addr", "dapp-addr");
			expect(r[ApiParams.status]).toBe("ok");
			expect(r[ApiParams.difficulty]).toBe(1);
			expect(r[ApiParams.challenge].split(POW_SEPARATOR)).toHaveLength(4);
			expect(r[ApiParams.challenge]).toContain("___user-addr___dapp-addr___0");
			expect(typeof r[ApiParams.timestamp]).toBe("string");
			expect(
				r[ApiParams.signature][ApiParams.provider][ApiParams.challenge],
			).toBe("");
		});

		it("uses a current timestamp", () => {
			const before = Date.now();
			const r = buildPowMaintenanceResponse("u", "d");
			const after = Date.now();
			const ts = Number(r[ApiParams.timestamp]);
			expect(ts).toBeGreaterThanOrEqual(before);
			expect(ts).toBeLessThanOrEqual(after);
		});
	});

	describe("buildPuzzleMaintenanceResponse", () => {
		it("returns a forgiving puzzle (large tolerance) so any drop completes", () => {
			const r = buildPuzzleMaintenanceResponse("user-addr", "dapp-addr");
			expect(r[ApiParams.status]).toBe("ok");
			expect(r[ApiParams.tolerance]).toBeGreaterThanOrEqual(1000);
			expect(r[ApiParams.targetX]).toBe(100);
			expect(r[ApiParams.targetY]).toBe(100);
			expect(r[ApiParams.originX]).toBe(0);
			expect(r[ApiParams.originY]).toBe(0);
			expect(r[ApiParams.challenge].split(POW_SEPARATOR)).toHaveLength(4);
			expect(
				r[ApiParams.signature][ApiParams.provider][ApiParams.challenge],
			).toBe("");
		});
	});
});
