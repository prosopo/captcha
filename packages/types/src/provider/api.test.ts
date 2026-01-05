// Copyright 2021-2025 Prosopo (UK) Ltd.
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
import { ApiParams } from "../api/params.js";
import { CaptchaType } from "../client/captchaType/captchaType.js";
import { Tier } from "../client/user.js";
import { POW_SEPARATOR } from "../datasets/captcha.js";
import {
	AdminApiPaths,
	ApiPathRateLimits,
	BlockRuleSpec,
	BlockRuleType,
	CaptchaRequestBody,
	CaptchaSolutionBody,
	ClientApiPaths,
	DEFAULT_SOLVED_COUNT,
	DEFAULT_UNSOLVED_COUNT,
	DappDomainRequestBody,
	GetFrictionlessCaptchaChallengeRequestBody,
	GetPowCaptchaChallengeRequestBody,
	ProsopoCaptchaCountConfigSchema,
	ProviderDefaultRateLimits,
	PublicApiPaths,
	RegisterSitekeyBody,
	RemoveDetectorKeyBodySpec,
	ServerPowCaptchaVerifyRequestBody,
	SubmitPowCaptchaSolutionBody,
	ToggleMaintenanceModeBody,
	UpdateDetectorKeyBody,
	VerifySolutionBody,
	providerDetailsSchema,
} from "./api.js";

describe("provider api", () => {
	describe("API paths enums", () => {
		it("ClientApiPaths has correct values", () => {
			expect(ClientApiPaths.GetImageCaptchaChallenge).toBe(
				"/v1/prosopo/provider/client/captcha/image",
			);
			expect(ClientApiPaths.GetPowCaptchaChallenge).toBe(
				"/v1/prosopo/provider/client/captcha/pow",
			);
			expect(ClientApiPaths.GetFrictionlessCaptchaChallenge).toBe(
				"/v1/prosopo/provider/client/captcha/frictionless",
			);
		});

		it("PublicApiPaths has correct values", () => {
			expect(PublicApiPaths.Healthz).toBe("/healthz");
			expect(PublicApiPaths.GetProviderDetails).toBe(
				"/v1/prosopo/provider/public/details",
			);
		});

		it("AdminApiPaths has correct values", () => {
			expect(AdminApiPaths.SiteKeyRegister).toBe(
				"/v1/prosopo/provider/admin/sitekey/register",
			);
			expect(AdminApiPaths.UpdateDetectorKey).toBe(
				"/v1/prosopo/provider/admin/detector/update",
			);
		});
	});

	describe("ProviderDefaultRateLimits", () => {
		it("has rate limits for all API paths", () => {
			expect(
				ProviderDefaultRateLimits[ClientApiPaths.GetImageCaptchaChallenge],
			).toBeDefined();
			expect(
				ProviderDefaultRateLimits[ClientApiPaths.GetPowCaptchaChallenge],
			).toBeDefined();
			expect(ProviderDefaultRateLimits[PublicApiPaths.Healthz]).toBeUndefined();
		});

		it("has correct rate limit structure", () => {
			const limit =
				ProviderDefaultRateLimits[ClientApiPaths.GetImageCaptchaChallenge];
			expect(limit.windowMs).toBe(60000);
			expect(limit.limit).toBe(30);
		});
	});

	describe("ApiPathRateLimits", () => {
		it("validates rate limits with defaults", () => {
			// ApiPathRateLimits requires all paths to be present
			const limits = ProviderDefaultRateLimits;

			const result = ApiPathRateLimits.parse(limits);
			expect(result[ClientApiPaths.GetImageCaptchaChallenge].windowMs).toBe(
				60000,
			);
			expect(result[ClientApiPaths.GetImageCaptchaChallenge].limit).toBe(30);
		});
	});

	describe("providerDetailsSchema", () => {
		it("validates provider details", () => {
			const details = {
				version: "1.0.0",
				message: "OK",
				redis: [
					{
						actor: "actor1",
						isReady: true,
						awaitingTimeSeconds: 0,
					},
				],
			};

			expect(() => providerDetailsSchema.parse(details)).not.toThrow();
		});

		it("rejects invalid provider details", () => {
			const invalidDetails = {
				version: "1.0.0",
			};

			expect(() => providerDetailsSchema.parse(invalidDetails)).toThrow();
		});
	});

	describe("CaptchaRequestBody", () => {
		it("validates captcha request body", () => {
			const body = {
				[ApiParams.user]: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
				[ApiParams.dapp]: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
				[ApiParams.datasetId]: "dataset123",
			};

			expect(() => CaptchaRequestBody.parse(body)).not.toThrow();
		});

		it("validates captcha request body with array datasetId", () => {
			const body = {
				[ApiParams.user]: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
				[ApiParams.dapp]: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
				[ApiParams.datasetId]: [1, 2, 3],
			};

			expect(() => CaptchaRequestBody.parse(body)).not.toThrow();
		});

		it("validates captcha request body with optional sessionId", () => {
			const body = {
				[ApiParams.user]: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
				[ApiParams.dapp]: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
				[ApiParams.datasetId]: "dataset123",
				[ApiParams.sessionId]: "session123",
			};

			expect(() => CaptchaRequestBody.parse(body)).not.toThrow();
		});
	});

	describe("CaptchaSolutionBody", () => {
		it("validates captcha solution body", () => {
			const body = {
				[ApiParams.user]: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
				[ApiParams.dapp]: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
				[ApiParams.captchas]: [
					{
						captchaId: "captcha1",
						captchaContentId: "content1",
						salt: "a".repeat(34),
						solution: ["0x1234"],
					},
				],
				[ApiParams.requestHash]: "0xrequesthash",
				[ApiParams.timestamp]: "1234567890",
				[ApiParams.signature]: {
					[ApiParams.user]: {
						[ApiParams.timestamp]: "1234567890",
					},
					[ApiParams.provider]: {
						[ApiParams.requestHash]: "0xrequesthash",
					},
				},
			};

			expect(() => CaptchaSolutionBody.parse(body)).not.toThrow();
		});
	});

	describe("VerifySolutionBody", () => {
		it("validates verify solution body with defaults", () => {
			const body = {
				[ApiParams.token]: "0x1234",
				[ApiParams.dappSignature]: "0xsignature",
			};

			const result = VerifySolutionBody.parse(body);
			expect(result[ApiParams.maxVerifiedTime]).toBeDefined();
		});

		it("validates verify solution body with custom maxVerifiedTime", () => {
			const body = {
				[ApiParams.token]: "0x1234",
				[ApiParams.dappSignature]: "0xsignature",
				[ApiParams.maxVerifiedTime]: 300000,
			};

			const result = VerifySolutionBody.parse(body);
			expect(result[ApiParams.maxVerifiedTime]).toBe(300000);
		});
	});

	describe("GetPowCaptchaChallengeRequestBody", () => {
		it("validates PoW captcha challenge request body", () => {
			const body = {
				[ApiParams.user]: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
				[ApiParams.dapp]: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
			};

			expect(() => GetPowCaptchaChallengeRequestBody.parse(body)).not.toThrow();
		});

		it("validates with optional sessionId", () => {
			const body = {
				[ApiParams.user]: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
				[ApiParams.dapp]: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
				[ApiParams.sessionId]: "session123",
			};

			expect(() => GetPowCaptchaChallengeRequestBody.parse(body)).not.toThrow();
		});
	});

	describe("SubmitPowCaptchaSolutionBody", () => {
		it("validates PoW captcha solution body", () => {
			const challengeId = `1234567890${POW_SEPARATOR}user${POW_SEPARATOR}dapp${POW_SEPARATOR}extra`;
			const body = {
				[ApiParams.challenge]: challengeId,
				[ApiParams.difficulty]: 4,
				[ApiParams.signature]: {
					[ApiParams.user]: {
						[ApiParams.timestamp]: "1234567890",
					},
					[ApiParams.provider]: {
						[ApiParams.challenge]: "0xchallenge",
					},
				},
				[ApiParams.user]: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
				[ApiParams.dapp]: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
				[ApiParams.nonce]: 42,
			};

			expect(() => SubmitPowCaptchaSolutionBody.parse(body)).not.toThrow();
		});
	});

	describe("GetFrictionlessCaptchaChallengeRequestBody", () => {
		it("validates frictionless captcha challenge request body", () => {
			const body = {
				[ApiParams.dapp]: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
				[ApiParams.token]: "token123",
				[ApiParams.user]: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
				[ApiParams.headHash]: "0xheadhash",
			};

			expect(() =>
				GetFrictionlessCaptchaChallengeRequestBody.parse(body),
			).not.toThrow();
		});
	});

	describe("RegisterSitekeyBody", () => {
		it("validates register sitekey body", () => {
			const body = {
				[ApiParams.siteKey]: "sitekey123",
				[ApiParams.tier]: Tier.Free,
			};

			expect(() => RegisterSitekeyBody.parse(body)).not.toThrow();
		});

		it("validates with optional settings", () => {
			const body = {
				[ApiParams.siteKey]: "sitekey123",
				[ApiParams.tier]: Tier.Professional,
				[ApiParams.settings]: {
					captchaType: CaptchaType.image,
				},
			};

			expect(() => RegisterSitekeyBody.parse(body)).not.toThrow();
		});
	});

	describe("UpdateDetectorKeyBody", () => {
		it("validates update detector key body", () => {
			const body = {
				[ApiParams.detectorKey]: "detectorkey123",
			};

			expect(() => UpdateDetectorKeyBody.parse(body)).not.toThrow();
		});
	});

	describe("RemoveDetectorKeyBodySpec", () => {
		it("validates remove detector key body", () => {
			const body = {
				[ApiParams.detectorKey]: "detectorkey123",
			};

			expect(() => RemoveDetectorKeyBodySpec.parse(body)).not.toThrow();
		});

		it("validates with optional expirationInSeconds", () => {
			const body = {
				[ApiParams.detectorKey]: "detectorkey123",
				[ApiParams.expirationInSeconds]: 3600,
			};

			expect(() => RemoveDetectorKeyBodySpec.parse(body)).not.toThrow();
		});
	});

	describe("ToggleMaintenanceModeBody", () => {
		it("validates toggle maintenance mode body", () => {
			const body = {
				[ApiParams.enabled]: true,
			};

			expect(() => ToggleMaintenanceModeBody.parse(body)).not.toThrow();
		});

		it("validates with false value", () => {
			const body = {
				[ApiParams.enabled]: false,
			};

			expect(() => ToggleMaintenanceModeBody.parse(body)).not.toThrow();
		});
	});

	describe("ProsopoCaptchaCountConfigSchema", () => {
		it("validates captcha count config with defaults", () => {
			const config = {};

			const result = ProsopoCaptchaCountConfigSchema.parse(config);
			expect(result.solved.count).toBe(DEFAULT_SOLVED_COUNT);
			expect(result.unsolved.count).toBe(DEFAULT_UNSOLVED_COUNT);
		});

		it("validates with custom values", () => {
			const config = {
				solved: { count: 3 },
				unsolved: { count: 1 },
			};

			const result = ProsopoCaptchaCountConfigSchema.parse(config);
			expect(result.solved.count).toBe(3);
			expect(result.unsolved.count).toBe(1);
		});
	});

	describe("BlockRuleType enum", () => {
		it("has correct enum values", () => {
			expect(BlockRuleType.ipAddress).toBe("ipAddress");
			expect(BlockRuleType.userAccount).toBe("userAccount");
		});
	});

	describe("BlockRuleSpec", () => {
		it("validates block rule", () => {
			const rule = {
				global: false,
				hardBlock: true,
				type: BlockRuleType.ipAddress,
			};

			expect(() => BlockRuleSpec.parse(rule)).not.toThrow();
		});

		it("validates block rule with optional fields", () => {
			const rule = {
				global: true,
				hardBlock: false,
				type: BlockRuleType.userAccount,
				dappAccount: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
				captchaConfig: {
					solved: { count: 2 },
					unsolved: { count: 0 },
				},
			};

			expect(() => BlockRuleSpec.parse(rule)).not.toThrow();
		});
	});

	describe("DappDomainRequestBody", () => {
		it("validates dapp domain request body", () => {
			const body = {
				[ApiParams.dapp]: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
			};

			expect(() => DappDomainRequestBody.parse(body)).not.toThrow();
		});
	});

	describe("ServerPowCaptchaVerifyRequestBody", () => {
		it("validates server PoW captcha verify body with defaults", () => {
			const body = {
				[ApiParams.token]: "0x1234",
				[ApiParams.dappSignature]: "0xsignature",
			};

			const result = ServerPowCaptchaVerifyRequestBody.parse(body);
			expect(result[ApiParams.verifiedTimeout]).toBeDefined();
		});

		it("validates with custom verifiedTimeout", () => {
			const body = {
				[ApiParams.token]: "0x1234",
				[ApiParams.dappSignature]: "0xsignature",
				[ApiParams.verifiedTimeout]: 120000,
			};

			const result = ServerPowCaptchaVerifyRequestBody.parse(body);
			expect(result[ApiParams.verifiedTimeout]).toBe(120000);
		});
	});
});
