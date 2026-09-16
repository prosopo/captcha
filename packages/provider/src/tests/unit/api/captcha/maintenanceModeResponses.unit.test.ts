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
	buildMaintenanceVerificationResponse,
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
			// Match the full expected shape `<prefix>-<uuid>` rather than
			// substring-checking, so we don't trip CodeQL's URL-substring
			// sanitisation false-positive and the assertion is tighter.
			expect(r[ApiParams.sessionId]).toMatch(
				/^foo-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
			);
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
		it("returns rendered imagery rather than coordinates", async () => {
			const r = await buildPuzzleMaintenanceResponse("user-addr", "dapp-addr");
			expect(r[ApiParams.status]).toBe("ok");
			expect(r[ApiParams.background]).toMatch(/^data:image\/webp;base64,/);
			expect(r[ApiParams.piece]).toMatch(/^data:image\/webp;base64,/);
			expect(r[ApiParams.pieceSize]).toBeGreaterThan(0);
			// The answer must not be derivable from the response.
			expect(JSON.stringify(r)).not.toContain("targetX");
			expect(r[ApiParams.originX]).toBe(60);
			expect(r[ApiParams.originY]).toBe(100);
			expect(r[ApiParams.challenge].split(POW_SEPARATOR)).toHaveLength(4);
			expect(
				r[ApiParams.signature][ApiParams.provider][ApiParams.challenge],
			).toBe("");
		});
	});

	describe("buildMaintenanceVerificationResponse", () => {
		it("uses the localised verified status rather than a bare `ok`", () => {
			const r = buildMaintenanceVerificationResponse(
				(key) => `translated:${key}`,
			);
			expect(r[ApiParams.status]).toBe("translated:API.USER_VERIFIED");
			expect(r[ApiParams.verified]).toBe(true);
		});

		it("always reports a score, since the tier gate needs a DB record", () => {
			const r = buildMaintenanceVerificationResponse((key) => key);
			// 0 is the most-human end of the scale, so a caller thresholding on
			// `score < x` passes rather than being rejected on `undefined`.
			expect(r[ApiParams.score]).toBe(0);
		});

		it("omits the failure-only reason field", () => {
			const r = buildMaintenanceVerificationResponse((key) => key);
			expect(r).not.toHaveProperty(ApiParams.reason);
		});
	});
});
