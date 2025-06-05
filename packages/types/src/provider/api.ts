// Copyright 2021-2024 Prosopo (UK) Ltd.
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

import type { ApiJsonError } from "@prosopo/common";
import type { Address4, Address6 } from "ip-address";
import {
	type ZodDefault,
	type ZodNumber,
	type ZodObject,
	type ZodOptional,
	array,
	boolean,
	coerce,
	type input,
	nativeEnum,
	number,
	object,
	type output,
	string,
	union,
	type infer as zInfer,
} from "zod";
import { ApiParams } from "../api/params.js";
import type { CaptchaType } from "../client/captchaType/captchaType.js";
import { ClientSettingsSchema, Tier } from "../client/index.js";
import {
	DEFAULT_IMAGE_MAX_VERIFIED_TIME_CACHED,
	DEFAULT_POW_CAPTCHA_VERIFIED_TIMEOUT,
} from "../config/timeouts.js";
import {
	type Captcha,
	CaptchaSolutionSchema,
	type DappAccount,
	type DatasetID,
	type PoWChallengeId,
	PowChallengeIdSchema,
	type UserAccount,
} from "../datasets/index.js";
import {
	type ChallengeSignature,
	ProcaptchaTokenSpec,
	type RequestHashSignature,
	RequestHashSignatureSchema,
	TimestampSignatureSchema,
} from "../procaptcha/index.js";

export const ApiPrefix = "/v1/prosopo" as const;

export type IPAddress = Address4 | Address6;

export enum ClientApiPaths {
	GetImageCaptchaChallenge = "/v1/prosopo/provider/client/captcha/image",
	GetPowCaptchaChallenge = "/v1/prosopo/provider/client/captcha/pow",
	GetFrictionlessCaptchaChallenge = "/v1/prosopo/provider/client/captcha/frictionless",
	SubmitImageCaptchaSolution = "/v1/prosopo/provider/client/solution",
	SubmitPowCaptchaSolution = "/v1/prosopo/provider/client/pow/solution",
	VerifyPowCaptchaSolution = "/v1/prosopo/provider/client/pow/verify",
	VerifyImageCaptchaSolutionDapp = "/v1/prosopo/provider/client/image/dapp/verify",
	GetProviderStatus = "/v1/prosopo/provider/client/status",
	SubmitUserEvents = "/v1/prosopo/provider/client/events",
}

export enum PublicApiPaths {
	GetProviderDetails = "/v1/prosopo/provider/public/details",
}

export type TGetImageCaptchaChallengePathAndParams =
	`${ClientApiPaths.GetImageCaptchaChallenge}/${DatasetID}/${UserAccount}/${DappAccount}`;

export type TGetImageCaptchaChallengeURL =
	`${string}${TGetImageCaptchaChallengePathAndParams}`;

export type TGetPowCaptchaChallengeURL =
	`${string}${ClientApiPaths.GetPowCaptchaChallenge}`;

export type TSubmitPowCaptchaSolutionURL =
	`${string}${ClientApiPaths.SubmitPowCaptchaSolution}`;

export enum AdminApiPaths {
	SiteKeyRegister = "/v1/prosopo/provider/admin/sitekey/register",
	UpdateDetectorKey = "/v1/prosopo/provider/admin/detector/update",
	RemoveDetectorKey = "/v1/prosopo/provider/admin/detector/remove",
}

export type CombinedApiPaths = ClientApiPaths | AdminApiPaths;

export const ProviderDefaultRateLimits = {
	[ClientApiPaths.GetImageCaptchaChallenge]: { windowMs: 60000, limit: 30 },
	[ClientApiPaths.GetPowCaptchaChallenge]: { windowMs: 60000, limit: 60 },
	[ClientApiPaths.SubmitImageCaptchaSolution]: { windowMs: 60000, limit: 60 },
	[ClientApiPaths.GetFrictionlessCaptchaChallenge]: {
		windowMs: 60000,
		limit: 60,
	},
	[ClientApiPaths.SubmitPowCaptchaSolution]: { windowMs: 60000, limit: 60 },
	[ClientApiPaths.VerifyPowCaptchaSolution]: { windowMs: 60000, limit: 60 },
	[ClientApiPaths.VerifyImageCaptchaSolutionDapp]: {
		windowMs: 60000,
		limit: 60,
	},
	[ClientApiPaths.GetProviderStatus]: { windowMs: 60000, limit: 60 },
	[PublicApiPaths.GetProviderDetails]: { windowMs: 60000, limit: 60 },
	[ClientApiPaths.SubmitUserEvents]: { windowMs: 60000, limit: 60 },
	[AdminApiPaths.SiteKeyRegister]: { windowMs: 60000, limit: 5 },
	[AdminApiPaths.UpdateDetectorKey]: { windowMs: 60000, limit: 5 },
	[AdminApiPaths.RemoveDetectorKey]: { windowMs: 60000, limit: 5 },
};

type RateLimit = {
	windowMs: number;
	limit: number;
};

export type RequestHeaders = {
	[key: string]: string;
};

export type Hash = string | number[];

export type Provider = {
	url: Array<number>;
	datasetId: Hash;
};

export type FrontendProvider = {
	url: string;
	datasetId: string;
};

export type RandomProvider = {
	providerAccount: string;
	provider: FrontendProvider;
};

type RateLimitSchemaType = ZodObject<{
	windowMs: ZodDefault<ZodOptional<ZodNumber>>;
	limit: ZodDefault<ZodOptional<ZodNumber>>;
}>;

// Utility function to create Zod schemas with defaults
const createRateLimitSchemaWithDefaults = (
	paths: Record<CombinedApiPaths, RateLimit>,
) =>
	object(
		Object.entries(paths).reduce(
			(schemas, [path, defaults]) => {
				const enumPath = path as CombinedApiPaths;
				schemas[enumPath] = object({
					windowMs: coerce.number().optional().default(defaults.windowMs),
					limit: coerce.number().optional().default(defaults.limit),
				});

				return schemas;
			},
			{} as Record<CombinedApiPaths, RateLimitSchemaType>,
		),
	);

export const ApiPathRateLimits = createRateLimitSchemaWithDefaults(
	ProviderDefaultRateLimits,
);

export interface DappUserSolutionResult {
	[ApiParams.captchas]: CaptchaIdAndProof[];
	partialFee?: string;
	[ApiParams.verified]: boolean;
}

export interface CaptchaSolutionResponse
	extends ApiResponse,
		DappUserSolutionResult {}

export interface CaptchaIdAndProof {
	captchaId: string;
	proof: string[][];
}

export const CaptchaRequestBody = object({
	[ApiParams.user]: string(),
	[ApiParams.dapp]: string(),
	[ApiParams.datasetId]: union([string(), array(number())]),
	[ApiParams.sessionId]: string().optional(),
});

export type CaptchaRequestBodyType = zInfer<typeof CaptchaRequestBody>;
export type CaptchaRequestBodyTypeOutput = output<typeof CaptchaRequestBody>;

export interface CaptchaResponseBody extends ApiResponse {
	[ApiParams.captchas]: Captcha[];
	[ApiParams.requestHash]: string;
	[ApiParams.timestamp]: string;
	[ApiParams.signature]: {
		[ApiParams.provider]: RequestHashSignature;
	};
}

export const CaptchaSolutionBody = object({
	[ApiParams.user]: string(),
	[ApiParams.dapp]: string(),
	[ApiParams.captchas]: array(CaptchaSolutionSchema),
	[ApiParams.requestHash]: string(),
	[ApiParams.timestamp]: string(),
	[ApiParams.signature]: object({
		[ApiParams.user]: TimestampSignatureSchema,
		[ApiParams.provider]: RequestHashSignatureSchema,
	}),
});

export type CaptchaSolutionBodyType = zInfer<typeof CaptchaSolutionBody>;

export const VerifySolutionBody = object({
	[ApiParams.token]: ProcaptchaTokenSpec,
	[ApiParams.dappSignature]: string(),
	[ApiParams.maxVerifiedTime]: number()
		.optional()
		.default(DEFAULT_IMAGE_MAX_VERIFIED_TIME_CACHED),
	[ApiParams.ip]: string().optional(),
});

export type VerifySolutionBodyTypeInput = input<typeof VerifySolutionBody>;
export type VerifySolutionBodyTypeOutput = output<typeof VerifySolutionBody>;

export interface UpdateProviderClientsResponse extends ApiResponse {
	message: string;
}

export interface ProviderRegistered {
	status: "Registered" | "Unregistered";
}

export interface ApiResponse {
	[ApiParams.status]: string;
	[ApiParams.error]?: ApiJsonError;
}

export interface VerificationResponse extends ApiResponse {
	[ApiParams.verified]: boolean;
	[ApiParams.score]?: number;
}

export interface ImageVerificationResponse extends VerificationResponse {
	[ApiParams.commitmentId]?: Hash;
}

export interface GetPowCaptchaResponse extends ApiResponse {
	[ApiParams.challenge]: PoWChallengeId;
	[ApiParams.difficulty]: number;
	[ApiParams.timestamp]: string;
	[ApiParams.signature]: {
		[ApiParams.provider]: ChallengeSignature;
	};
}

export interface GetFrictionlessCaptchaResponse extends ApiResponse {
	[ApiParams.captchaType]: CaptchaType.pow | CaptchaType.image;
	[ApiParams.sessionId]?: string;
}

export interface PowCaptchaSolutionResponse extends ApiResponse {
	[ApiParams.verified]: boolean;
	[ApiParams.error]?: ApiJsonError;
}

/**
 * Request body for the server to verify a PoW captcha solution
 * @param {string} token - The Procaptcha token
 * @param {string} dappUserSignature - The signature proving ownership of the site key
 * @param {number} verifiedTimeout - The maximum time in milliseconds since the captcha was requested
 */
export const ServerPowCaptchaVerifyRequestBody = object({
	[ApiParams.token]: ProcaptchaTokenSpec,
	[ApiParams.dappSignature]: string(),
	[ApiParams.verifiedTimeout]: number()
		.optional()
		.default(DEFAULT_POW_CAPTCHA_VERIFIED_TIMEOUT),
	[ApiParams.ip]: string().optional(),
});

export type ServerPowCaptchaVerifyRequestBodyOutput = output<
	typeof ServerPowCaptchaVerifyRequestBody
>;

export const GetPowCaptchaChallengeRequestBody = object({
	[ApiParams.user]: string(),
	[ApiParams.dapp]: string(),
	[ApiParams.sessionId]: string().optional(),
});

export type GetPowCaptchaChallengeRequestBodyType = zInfer<
	typeof GetPowCaptchaChallengeRequestBody
>;

export type GetPowCaptchaChallengeRequestBodyTypeOutput = output<
	typeof GetPowCaptchaChallengeRequestBody
>;

export type ServerPowCaptchaVerifyRequestBodyType = zInfer<
	typeof ServerPowCaptchaVerifyRequestBody
>;

export const SubmitPowCaptchaSolutionBody = object({
	[ApiParams.challenge]: PowChallengeIdSchema,
	[ApiParams.difficulty]: number(),
	[ApiParams.signature]: object({
		[ApiParams.user]: object({
			[ApiParams.timestamp]: string(),
		}),
		[ApiParams.provider]: object({
			[ApiParams.challenge]: string(),
		}),
	}),
	[ApiParams.user]: string(),
	[ApiParams.dapp]: string(),
	[ApiParams.nonce]: number(),
	[ApiParams.verifiedTimeout]: number()
		.optional()
		.default(DEFAULT_POW_CAPTCHA_VERIFIED_TIMEOUT),
});

export type SubmitPowCaptchaSolutionBodyType = zInfer<
	typeof SubmitPowCaptchaSolutionBody
>;

export const GetFrictionlessCaptchaChallengeRequestBody = object({
	[ApiParams.dapp]: string(),
	[ApiParams.token]: string(),
	[ApiParams.user]: string(),
});
export type SubmitPowCaptchaSolutionBodyTypeOutput = output<
	typeof SubmitPowCaptchaSolutionBody
>;

export const VerifyPowCaptchaSolutionBody = object({
	[ApiParams.siteKey]: string(),
});

export const RegisterSitekeyBody = object({
	[ApiParams.siteKey]: string(),
	[ApiParams.tier]: nativeEnum(Tier),
	[ApiParams.settings]: ClientSettingsSchema.optional(),
});

export const UpdateDetectorKeyBody = object({
	[ApiParams.detectorKey]: string(),
});

export type RegisterSitekeyBodyTypeOutput = output<typeof RegisterSitekeyBody>;

export const ProsopoCaptchaCountConfigSchema = object({
	solved: object({
		count: number().positive(),
	})
		.optional()
		.default({ count: 1 }),
	unsolved: object({
		count: number().nonnegative(),
	})
		.optional()
		.default({ count: 0 }),
});

export type ProsopoCaptchaCountConfigSchemaInput = input<
	typeof ProsopoCaptchaCountConfigSchema
>;

export type ProsopoCaptchaCountConfigSchemaOutput = output<
	typeof ProsopoCaptchaCountConfigSchema
>;

export enum BlockRuleType {
	ipAddress = "ipAddress",
	userAccount = "userAccount",
}

const BlockRuleTypeSpec = nativeEnum(BlockRuleType);

export const BlockRuleSpec = object({
	global: boolean(),
	hardBlock: boolean(),
	type: BlockRuleTypeSpec,
	dappAccount: string().optional(),
	captchaConfig: ProsopoCaptchaCountConfigSchema.optional(),
});

export type BlockRule = zInfer<typeof BlockRuleSpec>;

export const DappDomainRequestBody = object({
	[ApiParams.dapp]: string(),
});
