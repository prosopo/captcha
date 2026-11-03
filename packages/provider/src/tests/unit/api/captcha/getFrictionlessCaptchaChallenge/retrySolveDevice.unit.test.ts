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

import { CaptchaStatus, type PoWChallengeId } from "@prosopo/types";
import type { PuzzleCaptchaRecord } from "@prosopo/types-database";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type RetryRequest,
	resolveRetrySolveDevice,
} from "../../../../../api/captcha/getFrictionlessCaptchaChallenge/retrySolveDevice.js";
import { getCompositeIpAddress } from "../../../../../compositeIpAddress.js";

const SITE_KEY = "5EjTA28bKSbFPPyMbUjNtArxyqjwq38r1BapVmLZShaqEedV";
const USER = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
const CHALLENGE =
	"1793717154110___5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY___5EjTA28bKSbFPPyMbUjNtArxyqjwq38r1BapVmLZShaqEedV___1" as PoWChallengeId;
const IP = "192.0.2.10";
const UA =
	"Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.6.1 Mobile/15E148 Safari/604.1";
const JA4 = "t13d2013h2_000000000000_000000000000";

const failedPuzzle = (
	overrides: Partial<PuzzleCaptchaRecord> = {},
): PuzzleCaptchaRecord =>
	({
		challenge: CHALLENGE,
		dappAccount: SITE_KEY,
		userAccount: USER,
		ipAddress: getCompositeIpAddress(IP),
		headers: { "user-agent": UA },
		ja4: JA4,
		userSubmitted: true,
		result: { status: CaptchaStatus.disapproved },
		behavioralDataPacked: {
			c1: [],
			c2: [{}, {}, {}],
			c3: [],
			c4: [],
			d: "mobile",
		},
		...overrides,
	}) as PuzzleCaptchaRecord;

const request = (overrides: Partial<RetryRequest> = {}): RetryRequest => ({
	retryOf: CHALLENGE,
	siteKey: SITE_KEY,
	userAccount: USER,
	ipAddress: getCompositeIpAddress(IP),
	userAgent: UA,
	ja4: JA4,
	...overrides,
});

let getPuzzleCaptchaRecordByChallenge: ReturnType<
	typeof vi.fn<(challenge: string) => Promise<PuzzleCaptchaRecord | null>>
>;
let claimPuzzleCaptchaRetry: ReturnType<
	typeof vi.fn<(challenge: PoWChallengeId) => Promise<boolean>>
>;

const db = () => ({
	getPuzzleCaptchaRecordByChallenge,
	claimPuzzleCaptchaRetry,
});

describe("resolveRetrySolveDevice", () => {
	beforeEach(() => {
		getPuzzleCaptchaRecordByChallenge = vi
			.fn()
			.mockResolvedValue(failedPuzzle());
		claimPuzzleCaptchaRetry = vi.fn().mockResolvedValue(true);
	});

	it("carries the failed solve's own readings for the same client", async () => {
		expect(await resolveRetrySolveDevice(db(), request())).toEqual({
			retryOf: CHALLENGE,
			solveDevice: { deviceCapability: "mobile", touchEventCount: 3 },
		});
		expect(claimPuzzleCaptchaRetry).toHaveBeenCalledWith(CHALLENGE);
	});

	it("does nothing when the request is not a retry", async () => {
		expect(
			await resolveRetrySolveDevice(db(), request({ retryOf: undefined })),
		).toBeUndefined();
		expect(getPuzzleCaptchaRecordByChallenge).not.toHaveBeenCalled();
	});

	it("does nothing without a TLS fingerprint to bind the client to", async () => {
		expect(
			await resolveRetrySolveDevice(db(), request({ ja4: undefined })),
		).toBeUndefined();
		expect(getPuzzleCaptchaRecordByChallenge).not.toHaveBeenCalled();
	});

	it("does nothing for a challenge the provider has no record of", async () => {
		getPuzzleCaptchaRecordByChallenge.mockResolvedValue(null);
		expect(await resolveRetrySolveDevice(db(), request())).toBeUndefined();
	});

	// Each of these is a client trying to take readings it did not produce,
	// or a puzzle that never failed. None may use up the retry either.
	it.each<[string, Partial<PuzzleCaptchaRecord>, Partial<RetryRequest>]>([
		["a different site", {}, { siteKey: "5Other" }],
		["a different user account", {}, { userAccount: "5Other" }],
		[
			"a different address on the same /24",
			{},
			{ ipAddress: getCompositeIpAddress("192.0.2.11") },
		],
		["a different user agent", {}, { userAgent: `${UA} extra` }],
		["a different TLS fingerprint", {}, { ja4: "t13d1516h2_other_other" }],
		["a puzzle that was never submitted", { userSubmitted: false }, {}],
		[
			"a puzzle that was solved",
			{ result: { status: CaptchaStatus.approved } },
			{},
		],
		[
			"a puzzle still pending",
			{ result: { status: CaptchaStatus.pending } },
			{},
		],
		[
			"a record whose address could not be read",
			{ ipAddress: getCompositeIpAddress("not an address") },
			{ ipAddress: getCompositeIpAddress("not an address") },
		],
	])("refuses %s", async (_, recordOverrides, requestOverrides) => {
		getPuzzleCaptchaRecordByChallenge.mockResolvedValue(
			failedPuzzle(recordOverrides),
		);
		expect(
			await resolveRetrySolveDevice(db(), request(requestOverrides)),
		).toBeUndefined();
		expect(claimPuzzleCaptchaRetry).not.toHaveBeenCalled();
	});

	it("refuses a solve whose behavioural payload never decoded", async () => {
		getPuzzleCaptchaRecordByChallenge.mockResolvedValue(
			failedPuzzle({ behavioralDataPacked: undefined }),
		);
		expect(await resolveRetrySolveDevice(db(), request())).toBeUndefined();
		expect(claimPuzzleCaptchaRetry).not.toHaveBeenCalled();
	});

	it("refuses a failed puzzle another retry has already taken", async () => {
		claimPuzzleCaptchaRetry.mockResolvedValue(false);
		expect(await resolveRetrySolveDevice(db(), request())).toBeUndefined();
	});
});
