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

import { ProviderApi } from "@prosopo/api";
import {
	CaptchaItemTypes,
	type CaptchaResponseBody,
	type CaptchaSolution,
	type CaptchaSolutionResponse,
	type ClientMetaData,
	type RandomProvider,
} from "@prosopo/types";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ProsopoCaptchaApi } from "../modules/ProsopoCaptchaApi.js";
import {
	PROVIDER_URL,
	SITE_KEY,
	USER_ADDRESS,
	captcha,
	challengeResponse,
	randomProvider,
	solutionResponse,
} from "./managerHarness.js";

const getCaptchaChallenge =
	vi.fn<
		(
			userAccount: string,
			randomProvider: RandomProvider,
			sessionId?: string,
			simdReadings?: string,
		) => Promise<CaptchaResponseBody>
	>();
const submitCaptchaSolution =
	vi.fn<
		(
			captchas: CaptchaSolution[],
			requestHash: string,
			userAccount: string,
			timestamp: string,
			providerRequestHashSignature: string,
			userTimestampSignature: string,
			behavioralData?: string,
			simdReadings?: string,
			clientMetaData?: ClientMetaData,
		) => Promise<CaptchaSolutionResponse>
	>();

/**
 * The class under test is a thin adapter over `ProviderApi`, so the double
 * subclasses the real client and replaces only the two calls it makes: the
 * compiler then holds the mocks to the real signatures.
 */
class ProviderApiStub extends ProviderApi {
	public override getCaptchaChallenge = getCaptchaChallenge;
	public override submitCaptchaSolution = submitCaptchaSolution;
}

const providerApi = (): ProviderApi =>
	new ProviderApiStub(PROVIDER_URL, SITE_KEY);

const build = (web2 = true): ProsopoCaptchaApi =>
	new ProsopoCaptchaApi(
		USER_ADDRESS,
		randomProvider(),
		providerApi(),
		web2,
		SITE_KEY,
	);

const solution = (
	overrides: Partial<CaptchaSolution> = {},
): CaptchaSolution => ({
	captchaId: "captcha-id-1",
	captchaContentId: "captcha-content-id-1",
	salt: "0xsalt",
	solution: ["hash-1"],
	...overrides,
});

beforeEach(() => {
	vi.clearAllMocks();
	getCaptchaChallenge.mockResolvedValue(challengeResponse());
	submitCaptchaSolution.mockResolvedValue(solutionResponse());
});

describe("construction", () => {
	test("keeps the identifiers it was handed", () => {
		const api = build();
		expect(api.userAccount).toBe(USER_ADDRESS);
		expect(api.dappAccount).toBe(SITE_KEY);
		expect(api.provider.provider.url).toBe(PROVIDER_URL);
	});

	test("exposes the web2 flag through a getter", () => {
		expect(build(true).web2).toBe(true);
		expect(build(false).web2).toBe(false);
	});
});

describe("getCaptchaChallenge", () => {
	test("forwards the account, provider, session and simd readings", async () => {
		const api = build();
		await api.getCaptchaChallenge("session-1", "simd-1");
		expect(getCaptchaChallenge).toHaveBeenCalledWith(
			USER_ADDRESS,
			randomProvider(),
			"session-1",
			"simd-1",
		);
	});

	test("upgrades plain-http image urls to https", async () => {
		const api = build();
		const challenge = await api.getCaptchaChallenge();
		expect(challenge.captchas[0]?.items[0]?.data).toBe(
			"https://provider.one/img/1.png",
		);
	});

	test("leaves an already-https url alone", async () => {
		const api = build();
		const challenge = await api.getCaptchaChallenge();
		expect(challenge.captchas[0]?.items[1]?.data).toBe(
			"https://provider.one/img/2.png",
		);
	});

	test("upgrades a protocol-relative url too", async () => {
		getCaptchaChallenge.mockResolvedValue(
			challengeResponse({
				captchas: [
					captcha({
						items: [
							{
								hash: "hash-1",
								data: "provider.one/img/3.png",
								type: CaptchaItemTypes.Image,
							},
						],
					}),
				],
			}),
		);
		const api = build();
		const challenge = await api.getCaptchaChallenge();
		expect(challenge.captchas[0]?.items[0]?.data).toBe(
			"https://provider.one/img/3.png",
		);
	});

	test("skips items with no data rather than producing a bare https://", async () => {
		getCaptchaChallenge.mockResolvedValue(
			challengeResponse({
				captchas: [
					captcha({
						items: [{ hash: "hash-1", data: "", type: CaptchaItemTypes.Image }],
					}),
				],
			}),
		);
		const api = build();
		const challenge = await api.getCaptchaChallenge();
		expect(challenge.captchas[0]?.items[0]?.data).toBe("");
	});

	test("handles an empty captcha list without touching anything", async () => {
		getCaptchaChallenge.mockResolvedValue(challengeResponse({ captchas: [] }));
		const api = build();
		await expect(api.getCaptchaChallenge()).resolves.toMatchObject({
			captchas: [],
		});
	});

	// An error response is a valid provider reply, so it is handed back
	// untouched for the manager to surface — only transport failures throw.
	test("returns an error response without rewriting urls", async () => {
		const errored = challengeResponse({
			error: { message: "no dataset", key: "API.BAD_REQUEST", code: 400 },
		});
		getCaptchaChallenge.mockResolvedValue(errored);
		const api = build();
		const challenge = await api.getCaptchaChallenge();
		expect(challenge).toBe(errored);
		expect(challenge.captchas[0]?.items[0]?.data).toBe(
			"http://provider.one/img/1.png",
		);
	});

	test("wraps a transport failure in an invalid-challenge error", async () => {
		getCaptchaChallenge.mockRejectedValue(new Error("network down"));
		const api = build();
		await expect(api.getCaptchaChallenge()).rejects.toThrow(
			"CAPTCHA.INVALID_CAPTCHA_CHALLENGE",
		);
	});

	test("wraps a non-error rejection too", async () => {
		getCaptchaChallenge.mockRejectedValue("just a string");
		const api = build();
		await expect(api.getCaptchaChallenge()).rejects.toThrow(
			"CAPTCHA.INVALID_CAPTCHA_CHALLENGE",
		);
	});
});

describe("submitCaptchaSolution", () => {
	test("forwards every field the provider needs", async () => {
		const api = build();
		const solutions = [solution()];
		await api.submitCaptchaSolution(
			"0xuser-signature",
			"0xrequest-hash",
			solutions,
			"1700000000000",
			"0xprovider-signature",
			"0xbehavioural",
			"simd-1",
			{ hp: "bot" },
		);
		expect(submitCaptchaSolution).toHaveBeenCalledWith(
			solutions,
			"0xrequest-hash",
			USER_ADDRESS,
			"1700000000000",
			"0xprovider-signature",
			"0xuser-signature",
			"0xbehavioural",
			"simd-1",
			{ hp: "bot" },
		);
	});

	test("returns the response alongside the merkle root as commitment id", async () => {
		const api = build();
		const response = solutionResponse();
		submitCaptchaSolution.mockResolvedValue(response);
		const [result, commitmentId] = await api.submitCaptchaSolution(
			"0xuser-signature",
			"0xrequest-hash",
			[solution()],
			"1700000000000",
			"0xprovider-signature",
		);
		expect(result).toBe(response);
		expect(commitmentId).toMatch(/^0x/);
	});

	test("derives a different commitment for a different solution", async () => {
		const api = build();
		const [, first] = await api.submitCaptchaSolution(
			"0xuser-signature",
			"0xrequest-hash",
			[solution()],
			"1700000000000",
			"0xprovider-signature",
		);
		const [, second] = await api.submitCaptchaSolution(
			"0xuser-signature",
			"0xrequest-hash",
			[solution({ solution: ["hash-2"] })],
			"1700000000000",
			"0xprovider-signature",
		);
		expect(second).not.toBe(first);
	});

	// An empty solution list builds an empty merkle tree, which has no root and
	// therefore no commitment to send.
	test("refuses to submit when there are no solutions to commit to", async () => {
		const api = build();
		await expect(
			api.submitCaptchaSolution(
				"0xuser-signature",
				"0xrequest-hash",
				[],
				"1700000000000",
				"0xprovider-signature",
			),
		).rejects.toThrow("CAPTCHA.INVALID_CAPTCHA_CHALLENGE");
		expect(submitCaptchaSolution).not.toHaveBeenCalled();
	});

	test("wraps a provider failure in an invalid-challenge error", async () => {
		submitCaptchaSolution.mockRejectedValue(new Error("provider exploded"));
		const api = build();
		await expect(
			api.submitCaptchaSolution(
				"0xuser-signature",
				"0xrequest-hash",
				[solution()],
				"1700000000000",
				"0xprovider-signature",
			),
		).rejects.toThrow("CAPTCHA.INVALID_CAPTCHA_CHALLENGE");
	});

	test("passes optional fields through as undefined when omitted", async () => {
		const api = build();
		await api.submitCaptchaSolution(
			"0xuser-signature",
			"0xrequest-hash",
			[solution()],
			"1700000000000",
			"0xprovider-signature",
		);
		const call = submitCaptchaSolution.mock.calls[0];
		expect(call?.[6]).toBeUndefined();
		expect(call?.[7]).toBeUndefined();
		expect(call?.[8]).toBeUndefined();
	});
});
