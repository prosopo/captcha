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

import { type Logger, getLogger } from "@prosopo/logger";
import {
	CaptchaType,
	type GetFrictionlessCaptchaResponse,
	type IPInfoResult,
	type ITrafficFilter,
	ResultReason,
	TrafficFilterAction,
} from "@prosopo/types";
import type { ClientRecord } from "@prosopo/types-database";
import type { Response } from "express";
import { describe, expect, it, vi } from "vitest";
import {
	applyTrafficFilterAtRequestTime,
	handleFrictionlessTrafficFilter,
} from "../../../../api/captcha/trafficFilterRequestTime.js";
import type { FrictionlessManager } from "../../../../tasks/frictionless/frictionlessTasks.js";

const logger: Logger = getLogger("error", "test:trafficFilterRequestTime");

const ipInfo = (overrides: Partial<IPInfoResult> = {}): IPInfoResult => ({
	ip: "1.2.3.4",
	isValid: true,
	isVPN: false,
	isTor: false,
	isProxy: false,
	isDatacenter: false,
	isAbuser: false,
	isMobile: false,
	isSatellite: false,
	isCrawler: false,
	...overrides,
});

describe("applyTrafficFilterAtRequestTime", () => {
	it("passes when trafficFilter is undefined (no site config)", () => {
		expect(
			applyTrafficFilterAtRequestTime(ipInfo({ isVPN: true }), undefined),
		).toEqual({ kind: "pass" });
	});

	it("passes when no category matches the ipInfo", () => {
		const trafficFilter: Partial<ITrafficFilter> = {
			vpn: { action: TrafficFilterAction.Block },
		};
		expect(
			applyTrafficFilterAtRequestTime(ipInfo({ isVPN: false }), trafficFilter),
		).toEqual({ kind: "pass" });
	});

	it("applies the abuser default even when trafficFilter omits abuser", () => {
		// Site set an empty-ish trafficFilter; abuser default fires at request time.
		expect(
			applyTrafficFilterAtRequestTime(
				ipInfo({ isAbuser: true, abuserScore: 0.9 }),
				{ vpn: { action: TrafficFilterAction.Block } },
			),
		).toMatchObject({ kind: "block", reason: ResultReason.ABUSER_BLOCKED });
	});

	it("returns block when a matched category has action:block", () => {
		expect(
			applyTrafficFilterAtRequestTime(ipInfo({ isVPN: true }), {
				vpn: { action: TrafficFilterAction.Block },
			}),
		).toEqual({ kind: "block", reason: ResultReason.VPN_BLOCKED });
	});

	it("returns challenge with the matched captchaType override", () => {
		expect(
			applyTrafficFilterAtRequestTime(ipInfo({ isVPN: true }), {
				vpn: {
					action: TrafficFilterAction.Challenge,
					captchaType: CaptchaType.image,
					solvedImagesCount: 7,
				},
			}),
		).toMatchObject({
			kind: "challenge",
			captchaType: CaptchaType.image,
			solvedImagesCount: 7,
			sourceCategories: ["vpn"],
		});
	});

	it("returns challenge with param overrides even when captchaType is omitted (direct endpoints use these)", () => {
		expect(
			applyTrafficFilterAtRequestTime(ipInfo({ isVPN: true }), {
				vpn: {
					action: TrafficFilterAction.Challenge,
					powDifficulty: 8,
				},
			}),
		).toMatchObject({
			kind: "challenge",
			captchaType: undefined,
			powDifficulty: 8,
		});
	});

	it("higher-precedence category wins over a lower-precedence block", () => {
		// Per-IP precedence: VPN outranks proxy. Even if proxy is configured
		// to block and VPN only to challenge, the IP is treated as VPN — the
		// proxy policy is not consulted.
		expect(
			applyTrafficFilterAtRequestTime(ipInfo({ isVPN: true, isProxy: true }), {
				vpn: {
					action: TrafficFilterAction.Challenge,
					captchaType: CaptchaType.pow,
				},
				proxy: { action: TrafficFilterAction.Block },
			}),
		).toMatchObject({
			kind: "challenge",
			captchaType: CaptchaType.pow,
			sourceCategories: ["vpn"],
		});
	});

	it("uses the top-precedence category's captchaType when several flags are set", () => {
		// Precedence order (highest first): tor > vpn > proxy. An IP flagged
		// as all three is owned by tor; only the tor policy is consulted.
		const verdict = applyTrafficFilterAtRequestTime(
			ipInfo({ isVPN: true, isProxy: true, isTor: true }),
			{
				vpn: {
					action: TrafficFilterAction.Challenge,
					captchaType: CaptchaType.pow,
					powDifficulty: 5,
				},
				proxy: {
					action: TrafficFilterAction.Challenge,
					captchaType: CaptchaType.puzzle,
				},
				tor: {
					action: TrafficFilterAction.Challenge,
					captchaType: CaptchaType.image,
					solvedImagesCount: 6,
				},
			},
			logger,
		);
		expect(verdict).toMatchObject({
			kind: "challenge",
			captchaType: CaptchaType.image,
			solvedImagesCount: 6,
			sourceCategories: ["tor"],
		});
	});
});

const clientRecord = (imageMaxRounds = 5): ClientRecord =>
	({
		account: "acc",
		tier: "professional",
		settings: {
			domains: ["example.com"],
			imageMaxRounds,
		},
		// biome-ignore lint/suspicious/noExplicitAny: only the fields read by handleFrictionlessTrafficFilter matter
	}) as any;

const makeFrictionlessManagerMock = () => {
	const okResponse = {
		status: "ok",
	} as unknown as GetFrictionlessCaptchaResponse;
	return {
		sendImageCaptcha: vi.fn(async () => okResponse),
		sendPowCaptcha: vi.fn(async () => okResponse),
		sendPuzzleCaptcha: vi.fn(async () => okResponse),
	} as unknown as FrictionlessManager & {
		sendImageCaptcha: ReturnType<typeof vi.fn>;
		sendPowCaptcha: ReturnType<typeof vi.fn>;
		sendPuzzleCaptcha: ReturnType<typeof vi.fn>;
	};
};

const makeResMock = () => {
	const jsonMock = vi.fn(function (this: unknown) {
		return this;
	});
	const statusMock = vi.fn(function (this: unknown) {
		return this;
	});
	const res = { status: statusMock, json: jsonMock } as unknown as Response;
	return { res, statusMock, jsonMock };
};

describe("handleFrictionlessTrafficFilter", () => {
	const dapp = "5EjTA28bKSbFPPyMbUjNtArxyqjwq38r1BapVmLZShaqEedV";
	const flatHeaders = {};
	const userSitekeyIpHash = "hash";

	it("passes through when verdict is kind:pass (caller falls through to decision machine)", async () => {
		const fm = makeFrictionlessManagerMock();
		const { res } = makeResMock();
		const outcome = await handleFrictionlessTrafficFilter(
			{
				verdict: { kind: "pass" },
				frictionlessManager: fm,
				clientRecord: clientRecord(),
				userSitekeyIpHash,
				dapp,
				ipInfo: ipInfo(),
				flatHeaders,
				logger,
			},
			res,
		);
		expect(outcome).toEqual({ handled: false });
		expect(fm.sendImageCaptcha).not.toHaveBeenCalled();
		expect(fm.sendPowCaptcha).not.toHaveBeenCalled();
		expect(fm.sendPuzzleCaptcha).not.toHaveBeenCalled();
	});

	it("responds 401 when verdict is kind:block", async () => {
		const fm = makeFrictionlessManagerMock();
		const { res, statusMock, jsonMock } = makeResMock();
		const outcome = await handleFrictionlessTrafficFilter(
			{
				verdict: { kind: "block", reason: ResultReason.VPN_BLOCKED },
				frictionlessManager: fm,
				clientRecord: clientRecord(),
				userSitekeyIpHash,
				dapp,
				ipInfo: ipInfo({ isVPN: true }),
				flatHeaders,
				logger,
			},
			res,
		);
		expect(outcome.handled).toBe(true);
		expect(statusMock).toHaveBeenCalledWith(401);
		expect(jsonMock).toHaveBeenCalledWith({ error: "Unauthorized" });
		expect(fm.sendImageCaptcha).not.toHaveBeenCalled();
	});

	it("dispatches to sendImageCaptcha when verdict names image, capping solvedImagesCount by imageMaxRounds", async () => {
		const fm = makeFrictionlessManagerMock();
		const { res } = makeResMock();
		const outcome = await handleFrictionlessTrafficFilter(
			{
				verdict: {
					kind: "challenge",
					captchaType: CaptchaType.image,
					solvedImagesCount: 99, // above imageMaxRounds:5
					sourceCategories: ["vpn"],
				},
				frictionlessManager: fm,
				clientRecord: clientRecord(5),
				userSitekeyIpHash,
				dapp,
				ipInfo: ipInfo({ isVPN: true }),
				flatHeaders,
				logger,
			},
			res,
		);
		expect(outcome.handled).toBe(true);
		expect(fm.sendImageCaptcha).toHaveBeenCalledTimes(1);
		const args = fm.sendImageCaptcha.mock.calls[0]?.[0];
		expect(args?.solvedImagesCount).toBe(5);
	});

	it("dispatches to sendPowCaptcha with the powDifficulty override", async () => {
		const fm = makeFrictionlessManagerMock();
		const { res } = makeResMock();
		await handleFrictionlessTrafficFilter(
			{
				verdict: {
					kind: "challenge",
					captchaType: CaptchaType.pow,
					powDifficulty: 8,
					sourceCategories: ["proxy"],
				},
				frictionlessManager: fm,
				clientRecord: clientRecord(),
				userSitekeyIpHash,
				dapp,
				ipInfo: ipInfo({ isProxy: true }),
				flatHeaders,
				logger,
			},
			res,
		);
		expect(fm.sendPowCaptcha).toHaveBeenCalledTimes(1);
		const args = fm.sendPowCaptcha.mock.calls[0]?.[0];
		expect(args?.powDifficulty).toBe(8);
	});

	it("dispatches to sendPuzzleCaptcha when verdict names puzzle", async () => {
		const fm = makeFrictionlessManagerMock();
		const { res } = makeResMock();
		await handleFrictionlessTrafficFilter(
			{
				verdict: {
					kind: "challenge",
					captchaType: CaptchaType.puzzle,
					puzzleTolerance: 10,
					sourceCategories: ["tor"],
				},
				frictionlessManager: fm,
				clientRecord: clientRecord(),
				userSitekeyIpHash,
				dapp,
				ipInfo: ipInfo({ isTor: true }),
				flatHeaders,
				logger,
			},
			res,
		);
		expect(fm.sendPuzzleCaptcha).toHaveBeenCalledTimes(1);
		expect(fm.sendPowCaptcha).not.toHaveBeenCalled();
		expect(fm.sendImageCaptcha).not.toHaveBeenCalled();
	});

	it("falls through when verdict is challenge without a captchaType (decision machine decides)", async () => {
		const fm = makeFrictionlessManagerMock();
		const { res } = makeResMock();
		const outcome = await handleFrictionlessTrafficFilter(
			{
				verdict: {
					kind: "challenge",
					captchaType: undefined,
					powDifficulty: 7,
					sourceCategories: ["vpn"],
				},
				frictionlessManager: fm,
				clientRecord: clientRecord(),
				userSitekeyIpHash,
				dapp,
				ipInfo: ipInfo({ isVPN: true }),
				flatHeaders,
				logger,
			},
			res,
		);
		expect(outcome).toEqual({ handled: false });
		expect(fm.sendImageCaptcha).not.toHaveBeenCalled();
		expect(fm.sendPowCaptcha).not.toHaveBeenCalled();
		expect(fm.sendPuzzleCaptcha).not.toHaveBeenCalled();
	});
});
