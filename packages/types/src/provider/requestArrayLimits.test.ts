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
import type { ZodIssue } from "zod";
import {
	CaptchaRequestBody,
	CaptchaSolutionBody,
	SubmitPuzzleCaptchaSolutionBody,
} from "./api.js";

const USER = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty";
const DAPP = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

const puzzleBody = (puzzleEvents: unknown[]): object => ({
	challenge: `1700000000000___${USER}___${DAPP}___1`,
	finalX: 1,
	finalY: 1,
	puzzleEvents,
	signature: { user: { timestamp: "0x01" }, provider: { challenge: "0x02" } },
	user: USER,
	dapp: DAPP,
});

const captcha = (solution: string[]): object => ({
	captchaId: "0x01",
	captchaContentId: "0x02",
	solution,
	salt: "0x03",
});

const solutionBody = (captchas: unknown[]): object => ({
	user: USER,
	dapp: DAPP,
	captchas,
	requestHash: "0x04",
	timestamp: "1700000000000",
	signature: {
		user: { timestamp: "0x01" },
		provider: { requestHash: "0x02" },
	},
});

const issues = (result: {
	success: boolean;
	error?: { issues: ZodIssue[] };
}): ZodIssue[] => result.error?.issues ?? [];

const event = (i: number): object => ({ x: i, y: i, t: 1700000000000 + i });

describe("request array caps", () => {
	it("accepts puzzleEvents up to 10,000 and rejects more", () => {
		const ok = Array.from({ length: 10_000 }, (_, i) => event(i));
		expect(
			SubmitPuzzleCaptchaSolutionBody.safeParse(puzzleBody(ok)).success,
		).toBe(true);
		const tooMany = [...ok, event(10_000)];
		const result = SubmitPuzzleCaptchaSolutionBody.safeParse(
			puzzleBody(tooMany),
		);
		expect(result.success).toBe(false);
		expect(issues(result)[0]?.path).toEqual(["puzzleEvents"]);
	});

	it("rejects a huge array of invalid puzzleEvents with one issue, not one per element", () => {
		const result = SubmitPuzzleCaptchaSolutionBody.safeParse(
			puzzleBody(Array.from({ length: 150_000 }, () => null)),
		);
		expect(result.success).toBe(false);
		expect(issues(result)).toHaveLength(1);
	});

	it("caps captchas at 256", () => {
		const within = Array.from({ length: 256 }, () => captcha(["0x05"]));
		expect(CaptchaSolutionBody.safeParse(solutionBody(within)).success).toBe(
			true,
		);
		const result = CaptchaSolutionBody.safeParse(
			solutionBody([...within, captcha(["0x05"])]),
		);
		expect(result.success).toBe(false);
		expect(issues(result)).toHaveLength(1);
	});

	it("caps each captcha's solution at 64 tiles", () => {
		const tiles = (n: number): string[] =>
			Array.from({ length: n }, (_, i) => `0x${i}`);
		expect(
			CaptchaSolutionBody.safeParse(solutionBody([captcha(tiles(64))])).success,
		).toBe(true);
		const result = CaptchaSolutionBody.safeParse(
			solutionBody([captcha(tiles(65))]),
		);
		expect(result.success).toBe(false);
		expect(issues(result)[0]?.path).toEqual(["captchas", 0, "solution"]);
	});

	it("caps a byte-array datasetId at 64 and still accepts a string", () => {
		const bytes = (n: number): number[] => Array.from({ length: n }, () => 1);
		const body = (datasetId: unknown): object => ({
			user: USER,
			dapp: DAPP,
			datasetId,
		});
		expect(CaptchaRequestBody.safeParse(body(bytes(32))).success).toBe(true);
		expect(CaptchaRequestBody.safeParse(body("0xabc")).success).toBe(true);
		expect(CaptchaRequestBody.safeParse(body(bytes(65))).success).toBe(false);
		const huge = CaptchaRequestBody.safeParse(
			body(Array.from({ length: 150_000 }, () => "x")),
		);
		expect(huge.success).toBe(false);
		expect(JSON.stringify(issues(huge)).length).toBeLessThan(2_000);
	});
});
