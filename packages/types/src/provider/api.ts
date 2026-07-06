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
	type z,
	type infer as zInfer,
} from "zod";
import { ApiParams } from "../api/params.js";
import {
	INPUT_LIMITS,
	boundedString,
	safeLine,
	safeText,
} from "../api/sanitise.js";
import {
	type CaptchaType,
	DecisionMachineCaptchaTypeSchema,
} from "../client/captchaType/captchaType.js";
import { ClientSettingsSchema, Tier } from "../client/index.js";
import { ModeEnum } from "../config/mode.js";
import { DEFAULT_IMAGE_MAX_VERIFIED_TIME_CACHED } from "../config/timeouts.js";
import {
	type Captcha,
	type DappAccount,
	type DatasetID,
	type PoWChallengeId,
	PowChallengeIdSchema,
	type UserAccount,
} from "../datasets/index.js";
import {
	DecisionMachineKind,
	DecisionMachineLanguage,
	DecisionMachineRuntime,
	DecisionMachineScope,
} from "../decisionMachine/index.js";
import type {
	ChallengeSignature,
	RequestHashSignature,
} from "../procaptcha/index.js";

export type ApiJsonError = {
	message: string;
	key?: string;
	code: number;
	data?: Record<string, unknown>;
};

export const ApiPrefix = "/v1/prosopo" as const;

export type IPAddress = Address4 | Address6;

export const DEFAULT_SOLVED_COUNT = 2;
export const DEFAULT_UNSOLVED_COUNT = 0;

export enum ClientApiPaths {
	GetImageCaptchaChallenge = "/v1/prosopo/provider/client/captcha/image",
	GetPowCaptchaChallenge = "/v1/prosopo/provider/client/captcha/pow",
	GetFrictionlessCaptchaChallenge = "/v1/prosopo/provider/client/captcha/frictionless",
	SubmitImageCaptchaSolution = "/v1/prosopo/provider/client/solution",
	SubmitPowCaptchaSolution = "/v1/prosopo/provider/client/pow/solution",
	VerifyPowCaptchaSolution = "/v1/prosopo/provider/client/pow/verify",
	VerifyImageCaptchaSolutionDapp = "/v1/prosopo/provider/client/image/dapp/verify",
	GetPuzzleCaptchaChallenge = "/v1/prosopo/provider/client/captcha/puzzle",
	SubmitPuzzleCaptchaSolution = "/v1/prosopo/provider/client/puzzle/solution",
	VerifyPuzzleCaptchaSolution = "/v1/prosopo/provider/client/puzzle/verify",
	GetProviderStatus = "/v1/prosopo/provider/client/status",
	SubmitUserEvents = "/v1/prosopo/provider/client/events",
	CheckSpamEmail = "/v1/prosopo/provider/client/spam/email",
}

export enum PublicApiPaths {
	Healthz = "/healthz",
	GetProviderDetails = "/v1/prosopo/provider/public/details",
	Metrics = "/metrics",
}

export const providerDetailsSchema = object({
	version: string(),
	message: string(),
	redis: object({
		actor: string(),
		isReady: boolean(),
		awaitingTimeSeconds: number(),
	}).array(),
});

export type ProviderDetails = output<typeof providerDetailsSchema>;

export type TGetImageCaptchaChallengePathAndParams =
	`${ClientApiPaths.GetImageCaptchaChallenge}/${DatasetID}/${UserAccount}/${DappAccount}`;

export type TGetImageCaptchaChallengeURL =
	`${string}${TGetImageCaptchaChallengePathAndParams}`;

export type TGetPowCaptchaChallengeURL =
	`${string}${ClientApiPaths.GetPowCaptchaChallenge}`;

export type TSubmitPowCaptchaSolutionURL =
	`${string}${ClientApiPaths.SubmitPowCaptchaSolution}`;

export type TGetPuzzleCaptchaChallengeURL =
	`${string}${ClientApiPaths.GetPuzzleCaptchaChallenge}`;

export type TSubmitPuzzleCaptchaSolutionURL =
	`${string}${ClientApiPaths.SubmitPuzzleCaptchaSolution}`;

export enum AdminApiPaths {
	SiteKeyRegister = "/v1/prosopo/provider/admin/sitekey/register",
	SiteKeysRegister = "/v1/prosopo/provider/admin/sitekeys/register",
	UpdateDetectorKey = "/v1/prosopo/provider/admin/detector/update",
	RemoveDetectorKey = "/v1/prosopo/provider/admin/detector/remove",
	ToggleMaintenanceMode = "/v1/prosopo/provider/admin/maintenance/toggle",
	UpdateDecisionMachine = "/v1/prosopo/provider/admin/decision-machine/update",
	GetAllDecisionMachines = "/v1/prosopo/provider/admin/decision-machine/get-all",
	GetDecisionMachine = "/v1/prosopo/provider/admin/decision-machine/get",
	RemoveDecisionMachine = "/v1/prosopo/provider/admin/decision-machine/remove",
	RemoveAllDecisionMachines = "/v1/prosopo/provider/admin/decision-machine/remove-all",
	ClearAllCounters = "/v1/prosopo/provider/admin/counters/clear-all",
	SiteKeyRemove = "/v1/prosopo/provider/admin/sitekey/remove",
	SiteKeysRemove = "/v1/prosopo/provider/admin/sitekeys/remove",
	// Receives batched DNS observation events from the dns sidecar.
	DnsEvent = "/v1/prosopo/provider/admin/dns/event",
}

export type CombinedApiPaths = ClientApiPaths | AdminApiPaths;

export const ProviderDefaultRateLimits = {
	[ClientApiPaths.GetImageCaptchaChallenge]: { windowMs: 60000, limit: 150 },
	[ClientApiPaths.GetPowCaptchaChallenge]: { windowMs: 60000, limit: 300 },
	[ClientApiPaths.SubmitImageCaptchaSolution]: {
		windowMs: 60000,
		limit: 300,
	},
	[ClientApiPaths.GetFrictionlessCaptchaChallenge]: {
		windowMs: 60000,
		limit: 300,
	},
	[ClientApiPaths.SubmitPowCaptchaSolution]: { windowMs: 60000, limit: 300 },
	[ClientApiPaths.VerifyPowCaptchaSolution]: { windowMs: 60000, limit: 15000 },
	[ClientApiPaths.GetPuzzleCaptchaChallenge]: { windowMs: 60000, limit: 300 },
	[ClientApiPaths.SubmitPuzzleCaptchaSolution]: {
		windowMs: 60000,
		limit: 300,
	},
	[ClientApiPaths.VerifyPuzzleCaptchaSolution]: {
		windowMs: 60000,
		limit: 15000,
	},
	[ClientApiPaths.VerifyImageCaptchaSolutionDapp]: {
		windowMs: 60000,
		limit: 15000,
	},
	[ClientApiPaths.GetProviderStatus]: { windowMs: 60000, limit: 60 },
	[ClientApiPaths.CheckSpamEmail]: { windowMs: 60000, limit: 60 },
	[PublicApiPaths.GetProviderDetails]: { windowMs: 60000, limit: 60 },
	[ClientApiPaths.SubmitUserEvents]: { windowMs: 60000, limit: 60 },
	[AdminApiPaths.SiteKeyRegister]: { windowMs: 60000, limit: 5 },
	[AdminApiPaths.SiteKeysRegister]: { windowMs: 60000, limit: 5 },
	[AdminApiPaths.UpdateDetectorKey]: { windowMs: 60000, limit: 5 },
	[AdminApiPaths.RemoveDetectorKey]: { windowMs: 60000, limit: 5 },
	[AdminApiPaths.ToggleMaintenanceMode]: { windowMs: 60000, limit: 5 },
	[AdminApiPaths.UpdateDecisionMachine]: { windowMs: 60000, limit: 5 },
	[AdminApiPaths.GetAllDecisionMachines]: { windowMs: 60000, limit: 60 },
	[AdminApiPaths.GetDecisionMachine]: { windowMs: 60000, limit: 60 },
	[AdminApiPaths.RemoveDecisionMachine]: { windowMs: 60000, limit: 5 },
	[AdminApiPaths.RemoveAllDecisionMachines]: { windowMs: 60000, limit: 5 },
	[AdminApiPaths.ClearAllCounters]: { windowMs: 60000, limit: 10 },
	[AdminApiPaths.SiteKeyRemove]: { windowMs: 60000, limit: 5 },
	[AdminApiPaths.SiteKeysRemove]: { windowMs: 60000, limit: 5 },
	// Sidecar batches events and POSTs at shipper_flush_ms cadence
	// (1s default), so a high per-minute ceiling is fine. Single ingest
	// path per pronode → no cross-tenant fairness concerns.
	[AdminApiPaths.DnsEvent]: { windowMs: 60000, limit: 600 },
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
	[ApiParams.user]: boundedString(INPUT_LIMITS.ID),
	[ApiParams.dapp]: boundedString(INPUT_LIMITS.ID),
	[ApiParams.datasetId]: union([
		boundedString(INPUT_LIMITS.ID),
		array(number()),
	]).optional(),
	[ApiParams.sessionId]: boundedString(INPUT_LIMITS.ID).optional(),
	[ApiParams.simdReadings]: boundedString(INPUT_LIMITS.TOKEN).optional(),
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

// Widget-controlled metadata sent alongside the captcha solution. The widget
// only populates this when the honeypot input has been filled in (which
// should only happen for bots). Server-side: persisted on the StoredCaptcha
// record, no automatic verdict. The TS shape (`ClientMetaData`) lives in
// ./database.ts — this schema is the wire-level zod for request bodies.
export const ClientMetaDataSchema = object({
	[ApiParams.hp]: safeText(INPUT_LIMITS.TEXT).optional(),
});

// Request-body-level bounded variants of shared schemas. The shared schemas
// (`ProcaptchaTokenSpec`, `CaptchaSolutionSchema`, `*SignatureSchema`) are also
// used for response/DB shapes, so rather than bound them at source we cap them
// here, where they flow in as untrusted request input.
const BoundedProcaptchaTokenSpec = boundedString(INPUT_LIMITS.TOKEN).startsWith(
	"0x",
);

const BoundedCaptchaSolutionSchema = object({
	captchaId: boundedString(INPUT_LIMITS.ID),
	captchaContentId: boundedString(INPUT_LIMITS.ID),
	solution: boundedString(INPUT_LIMITS.ID).array(),
	salt: boundedString(INPUT_LIMITS.ID),
});

export const CaptchaSolutionBody = object({
	[ApiParams.user]: boundedString(INPUT_LIMITS.ID),
	[ApiParams.dapp]: boundedString(INPUT_LIMITS.ID),
	[ApiParams.captchas]: array(BoundedCaptchaSolutionSchema),
	[ApiParams.requestHash]: boundedString(INPUT_LIMITS.ID),
	[ApiParams.timestamp]: boundedString(INPUT_LIMITS.ID),
	[ApiParams.signature]: object({
		[ApiParams.user]: object({
			[ApiParams.timestamp]: boundedString(INPUT_LIMITS.TOKEN),
		}),
		[ApiParams.provider]: object({
			[ApiParams.requestHash]: boundedString(INPUT_LIMITS.TOKEN),
		}),
	}),
	[ApiParams.behavioralData]: boundedString(INPUT_LIMITS.TOKEN).optional(),
	// Compact encoded SimdReadings produced by @prosopo/catcher's
	// simdReadingsCodec — opaque at this layer; the provider decodes and
	// persists on the captcha record. Collection-only, no scoring.
	[ApiParams.simdReadings]: boundedString(INPUT_LIMITS.TOKEN).optional(),
	[ApiParams.clientMetaData]: ClientMetaDataSchema.optional(),
});

export type CaptchaSolutionBodyType = zInfer<typeof CaptchaSolutionBody>;

export const VerifySolutionBody = object({
	[ApiParams.token]: BoundedProcaptchaTokenSpec,
	[ApiParams.dappSignature]: boundedString(INPUT_LIMITS.TOKEN),
	[ApiParams.maxVerifiedTime]: number()
		.optional()
		.default(DEFAULT_IMAGE_MAX_VERIFIED_TIME_CACHED),
	[ApiParams.ip]: boundedString(INPUT_LIMITS.ID).optional(),
	[ApiParams.email]: boundedString(INPUT_LIMITS.EMAIL).optional(),
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
	[ApiParams.reason]?: string;
}

export interface UpdateDetectorKeyResponse extends ApiResponse {
	data: {
		activeDetectorKeys: string[];
	};
}

export interface UpdateDecisionMachineResponse extends ApiResponse {
	data: {
		scope: DecisionMachineScope;
		dappAccount?: string;
		updatedAt: string;
	};
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

export interface GetPuzzleCaptchaResponse extends ApiResponse {
	[ApiParams.challenge]: PoWChallengeId;
	[ApiParams.targetX]: number;
	[ApiParams.targetY]: number;
	[ApiParams.originX]: number;
	[ApiParams.originY]: number;
	[ApiParams.tolerance]: number;
	[ApiParams.timestamp]: string;
	[ApiParams.signature]: {
		[ApiParams.provider]: ChallengeSignature;
	};
}

export interface PuzzleCaptchaSolutionResponse extends ApiResponse {
	[ApiParams.verified]: boolean;
	[ApiParams.error]?: ApiJsonError;
}

export interface GetFrictionlessCaptchaResponse extends ApiResponse {
	[ApiParams.captchaType]:
		| CaptchaType.pow
		| CaptchaType.image
		| CaptchaType.puzzle;
	[ApiParams.sessionId]?: string;
	// Encoded honeypot question. NOT serialised by the provider on the wire
	// (it travels in the `x-prosopo-meta` response header so it doesn't sit
	// in the JSON body for bots to grep); the API client moves it onto this
	// field after reading the header, so downstream widget code consumes it
	// the same way regardless of transport.
	[ApiParams.hp]?: string;
	// Per-session DNS observation URL; undefined when no dns sidecar.
	dns_url?: string;
}

export interface PowCaptchaSolutionEscalation {
	[ApiParams.captchaType]: CaptchaType.image | CaptchaType.puzzle;
	[ApiParams.sessionId]: string;
}

export interface PowCaptchaSolutionResponse extends ApiResponse {
	[ApiParams.verified]: boolean;
	[ApiParams.error]?: ApiJsonError;
	[ApiParams.escalation]?: PowCaptchaSolutionEscalation;
}

/**
 * Request body for the server to verify a PoW captcha solution.
 */
export const ServerPowCaptchaVerifyRequestBody = object({
	[ApiParams.token]: BoundedProcaptchaTokenSpec,
	[ApiParams.dappSignature]: boundedString(INPUT_LIMITS.TOKEN),
	[ApiParams.ip]: boundedString(INPUT_LIMITS.ID).optional(),
	[ApiParams.email]: boundedString(INPUT_LIMITS.EMAIL).email().optional(),
});

export type ServerPowCaptchaVerifyRequestBodyOutput = output<
	typeof ServerPowCaptchaVerifyRequestBody
>;

// ── DNS observation event ingestion (wire-compat with the dns sidecar) ─
export const DnsEventKindSchema = union([
	string().regex(/^dns$/),
	string().regex(/^http$/),
]);
export type DnsEventKind = "dns" | "http";

export const DnsEventSchema = object({
	kind: DnsEventKindSchema,
	ts: boundedString(INPUT_LIMITS.ID), // ISO-8601 UTC (serde default for chrono DateTime<Utc>)
	src_ip: boundedString(INPUT_LIMITS.ID),
	// Per-session ID carried in the URL subdomain — captures the procaptcha
	// sessionId. Named `jti` on the wire for cross-product compatibility
	// with Protect's session identifier.
	jti: boundedString(INPUT_LIMITS.ID).optional(),
	site_key: boundedString(INPUT_LIMITS.ID).optional(),
	subzone: boundedString(INPUT_LIMITS.ID).optional(),
	qname: boundedString(INPUT_LIMITS.ID).optional(),
	qtype: boundedString(INPUT_LIMITS.ID).optional(),
	sni: boundedString(INPUT_LIMITS.ID).optional(),
	path: boundedString(INPUT_LIMITS.URL).optional(),
	user_agent: safeLine(INPUT_LIMITS.TEXT).optional(),
	path_valid: boolean().optional(),
});
export type DnsEvent = output<typeof DnsEventSchema>;

export const DnsEventBatchSchema = object({
	events: array(DnsEventSchema),
});
export type DnsEventBatch = output<typeof DnsEventBatchSchema>;

export interface DnsEventResponseBody extends ApiResponse {
	stored: number;
	errors: number;
}

export const GetPowCaptchaChallengeRequestBody = object({
	[ApiParams.user]: boundedString(INPUT_LIMITS.ID),
	[ApiParams.dapp]: boundedString(INPUT_LIMITS.ID),
	[ApiParams.sessionId]: boundedString(INPUT_LIMITS.ID).optional(),
	[ApiParams.simdReadings]: boundedString(INPUT_LIMITS.TOKEN).optional(),
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
			[ApiParams.timestamp]: boundedString(INPUT_LIMITS.ID),
		}),
		[ApiParams.provider]: object({
			[ApiParams.challenge]: boundedString(INPUT_LIMITS.TOKEN),
		}),
	}),
	[ApiParams.user]: boundedString(INPUT_LIMITS.ID),
	[ApiParams.dapp]: boundedString(INPUT_LIMITS.ID),
	[ApiParams.nonce]: number(),
	[ApiParams.behavioralData]: boundedString(INPUT_LIMITS.TOKEN).optional(),
	[ApiParams.salt]: boundedString(INPUT_LIMITS.ID).optional(),
	[ApiParams.simdReadings]: boundedString(INPUT_LIMITS.TOKEN).optional(),
	[ApiParams.clientMetaData]: ClientMetaDataSchema.optional(),
	[ApiParams.fingerprintProof]: boundedString(INPUT_LIMITS.TOKEN).optional(),
});

export type SubmitPowCaptchaSolutionBodyType = input<
	typeof SubmitPowCaptchaSolutionBody
>;

export const GetFrictionlessCaptchaChallengeRequestBody = object({
	[ApiParams.dapp]: boundedString(INPUT_LIMITS.ID),
	[ApiParams.token]: boundedString(INPUT_LIMITS.TOKEN),
	[ApiParams.user]: boundedString(INPUT_LIMITS.ID),
	[ApiParams.headHash]: boundedString(INPUT_LIMITS.TOKEN),
	[ApiParams.mode]: nativeEnum(ModeEnum).optional(),
	[ApiParams.simdReadings]: boundedString(INPUT_LIMITS.TOKEN).optional(),
	// Full page URL the widget was rendered on (origin + path, no query
	// string / fragment / credentials). Sent by the client so the provider
	// can record which page a session originated from; re-sanitised
	// server-side and gated in the decision machine (a missing value forces
	// an image captcha). Optional on the wire so the schema still parses for
	// older clients — the decision machine handles absence.
	[ApiParams.currentUrl]: boundedString(INPUT_LIMITS.URL).optional(),
});

export type GetFrictionlessCaptchaChallengeRequestBodyOutput = output<
	typeof GetFrictionlessCaptchaChallengeRequestBody
>;

export type SubmitPowCaptchaSolutionBodyTypeOutput = output<
	typeof SubmitPowCaptchaSolutionBody
>;

// Puzzle captcha schemas

export const GetPuzzleCaptchaChallengeRequestBody = object({
	[ApiParams.user]: boundedString(INPUT_LIMITS.ID),
	[ApiParams.dapp]: boundedString(INPUT_LIMITS.ID),
	[ApiParams.sessionId]: boundedString(INPUT_LIMITS.ID).optional(),
	[ApiParams.simdReadings]: boundedString(INPUT_LIMITS.TOKEN).optional(),
});

export type GetPuzzleCaptchaChallengeRequestBodyType = zInfer<
	typeof GetPuzzleCaptchaChallengeRequestBody
>;

export type GetPuzzleCaptchaChallengeRequestBodyTypeOutput = output<
	typeof GetPuzzleCaptchaChallengeRequestBody
>;

// Event captured during a drag of the puzzle piece. `t` is milliseconds
// since the drag started (not absolute), which is enough for behavioural
// analysis and lets the trail be replay-portable.
export const PuzzleEventSchema = object({
	x: number(),
	y: number(),
	t: number(),
});

export type PuzzleEvent = zInfer<typeof PuzzleEventSchema>;

export const SubmitPuzzleCaptchaSolutionBody = object({
	[ApiParams.challenge]: PowChallengeIdSchema,
	[ApiParams.finalX]: number(),
	[ApiParams.finalY]: number(),
	[ApiParams.puzzleEvents]: array(PuzzleEventSchema),
	[ApiParams.signature]: object({
		[ApiParams.user]: object({
			[ApiParams.timestamp]: boundedString(INPUT_LIMITS.ID),
		}),
		[ApiParams.provider]: object({
			[ApiParams.challenge]: boundedString(INPUT_LIMITS.TOKEN),
		}),
	}),
	[ApiParams.user]: boundedString(INPUT_LIMITS.ID),
	[ApiParams.dapp]: boundedString(INPUT_LIMITS.ID),
	[ApiParams.behavioralData]: boundedString(INPUT_LIMITS.TOKEN).optional(),
	[ApiParams.salt]: boundedString(INPUT_LIMITS.ID).optional(),
	[ApiParams.simdReadings]: boundedString(INPUT_LIMITS.TOKEN).optional(),
	[ApiParams.clientMetaData]: ClientMetaDataSchema.optional(),
});

export type SubmitPuzzleCaptchaSolutionBodyType = input<
	typeof SubmitPuzzleCaptchaSolutionBody
>;

export type SubmitPuzzleCaptchaSolutionBodyTypeOutput = output<
	typeof SubmitPuzzleCaptchaSolutionBody
>;

export const ServerPuzzleCaptchaVerifyRequestBody = object({
	[ApiParams.token]: BoundedProcaptchaTokenSpec,
	[ApiParams.dappSignature]: boundedString(INPUT_LIMITS.TOKEN),
	[ApiParams.ip]: boundedString(INPUT_LIMITS.ID).optional(),
	[ApiParams.email]: boundedString(INPUT_LIMITS.EMAIL).email().optional(),
});

export type ServerPuzzleCaptchaVerifyRequestBodyType = zInfer<
	typeof ServerPuzzleCaptchaVerifyRequestBody
>;

export type ServerPuzzleCaptchaVerifyRequestBodyOutput = output<
	typeof ServerPuzzleCaptchaVerifyRequestBody
>;

export const VerifyPowCaptchaSolutionBody = object({
	[ApiParams.siteKey]: boundedString(INPUT_LIMITS.ID),
});

export const RegisterSitekeyBody = object({
	[ApiParams.siteKey]: boundedString(INPUT_LIMITS.ID),
	[ApiParams.tier]: nativeEnum(Tier),
	[ApiParams.settings]: ClientSettingsSchema.optional(),
});

export const RegisterSitekeysBody = array(
	object({
		[ApiParams.siteKey]: boundedString(INPUT_LIMITS.ID),
		[ApiParams.tier]: nativeEnum(Tier),
		[ApiParams.settings]: ClientSettingsSchema.optional(),
	}),
);

export const RemoveSitekeyBody = object({
	[ApiParams.siteKey]: boundedString(INPUT_LIMITS.ID),
});

export const RemoveSitekeysBody = array(
	object({
		[ApiParams.siteKey]: boundedString(INPUT_LIMITS.ID),
	}),
);

export const UpdateDetectorKeyBody = object({
	[ApiParams.detectorKey]: boundedString(INPUT_LIMITS.TOKEN),
});

export const UpdateDecisionMachineBody = object({
	[ApiParams.decisionMachineScope]: nativeEnum(DecisionMachineScope),
	[ApiParams.decisionMachineRuntime]: nativeEnum(DecisionMachineRuntime),
	[ApiParams.decisionMachineSource]: safeText(INPUT_LIMITS.LONG_TEXT),
	[ApiParams.decisionMachineLanguage]: nativeEnum(
		DecisionMachineLanguage,
	).optional(),
	[ApiParams.decisionMachineName]: safeLine(INPUT_LIMITS.NAME).optional(),
	[ApiParams.decisionMachineVersion]: boundedString(INPUT_LIMITS.ID).optional(),
	[ApiParams.decisionMachineCaptchaType]:
		DecisionMachineCaptchaTypeSchema.optional(),
	[ApiParams.decisionMachineKind]: nativeEnum(DecisionMachineKind).optional(),
	[ApiParams.dapp]: boundedString(INPUT_LIMITS.ID).optional(),
});

export const GetDecisionMachineBody = object({
	id: boundedString(INPUT_LIMITS.ID),
});

export const GetAllDecisionMachinesBody = object({});

export const RemoveDecisionMachineBody = object({
	id: boundedString(INPUT_LIMITS.ID),
});

export const RemoveAllDecisionMachinesBody = object({});

export const ClearAllCountersBody = object({
	[ApiParams.dapp]: boundedString(INPUT_LIMITS.ID).optional(),
});

export type ClearAllCountersBodyType = z.infer<typeof ClearAllCountersBody>;

export const ClearAllCountersResponse = object({
	success: boolean(),
	deletedCount: number(),
	scope: string(),
});

export type ClearAllCountersResponseType = z.infer<
	typeof ClearAllCountersResponse
>;

export const DecisionMachineSummarySchema = object({
	_id: string(),
	scope: nativeEnum(DecisionMachineScope),
	dappAccount: string().nullish(),
	kind: nativeEnum(DecisionMachineKind).nullish(),
	runtime: nativeEnum(DecisionMachineRuntime),
	language: nativeEnum(DecisionMachineLanguage).nullish(),
	name: string().nullish(),
	version: string().nullish(),
	captchaType: DecisionMachineCaptchaTypeSchema.nullish(),
	createdAt: string(),
	updatedAt: string(),
});

export type DecisionMachineSummary = z.infer<
	typeof DecisionMachineSummarySchema
>;

// Includes the full compiled `source` for every artifact so operators can
// audit exactly which code is live on a provider in a single call, without
// a follow-up get-by-id per machine.
export const GetAllDecisionMachinesResponse = array(
	DecisionMachineSummarySchema.extend({
		source: string(),
	}),
);

export type GetAllDecisionMachinesResponseType = z.infer<
	typeof GetAllDecisionMachinesResponse
>;

export const GetDecisionMachineResponse = DecisionMachineSummarySchema.extend({
	source: string(),
});

export type GetDecisionMachineResponseType = z.infer<
	typeof GetDecisionMachineResponse
>;

export const RemoveDecisionMachineResponse = object({
	success: boolean(),
	deletedId: string(),
});

export type RemoveDecisionMachineResponseType = z.infer<
	typeof RemoveDecisionMachineResponse
>;

export const RemoveAllDecisionMachinesResponse = object({
	success: boolean(),
	deletedCount: number(),
});

export type RemoveAllDecisionMachinesResponseType = z.infer<
	typeof RemoveAllDecisionMachinesResponse
>;

export const RemoveDetectorKeyBodySpec = object({
	[ApiParams.detectorKey]: boundedString(INPUT_LIMITS.TOKEN),
	[ApiParams.expirationInSeconds]: number().positive().optional(),
});

export type RemoveDetectorKeyBodyInput = input<
	typeof RemoveDetectorKeyBodySpec
>;
export type RemoveDetectorKeyBodyOutput = output<
	typeof RemoveDetectorKeyBodySpec
>;

export const ToggleMaintenanceModeBody = object({
	[ApiParams.enabled]: boolean(),
});

export type ToggleMaintenanceModeBodyOutput = output<
	typeof ToggleMaintenanceModeBody
>;

export type UpdateDecisionMachineBodyTypeOutput = output<
	typeof UpdateDecisionMachineBody
>;

export type RegisterSitekeyBodyTypeOutput = output<typeof RegisterSitekeyBody>;

export type RegisterSitekeysBodyTypeOutput = output<
	typeof RegisterSitekeysBody
>;

export type RemoveSitekeyBodyTypeOutput = output<typeof RemoveSitekeyBody>;

export type RemoveSitekeysBodyTypeOutput = output<typeof RemoveSitekeysBody>;

export const ProsopoCaptchaCountConfigSchema = object({
	solved: object({
		count: number().positive(),
	})
		.optional()
		.default({ count: DEFAULT_SOLVED_COUNT }),
	unsolved: object({
		count: number().nonnegative(),
	})
		.optional()
		.default({ count: DEFAULT_UNSOLVED_COUNT }),
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
