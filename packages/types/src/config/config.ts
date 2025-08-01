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

import { LanguageSchema } from "@prosopo/locale";
import type { input } from "zod";
import { literal } from "zod";
import { number } from "zod";
import { object } from "zod";
import type { output } from "zod";
import { record, string, enum as zEnum } from "zod";
import { union } from "zod";
import type { infer as zInfer } from "zod";
import z, { boolean } from "zod";
import {
	ApiPathRateLimits,
	DEFAULT_SOLVED_COUNT,
	DEFAULT_UNSOLVED_COUNT,
	ProsopoCaptchaCountConfigSchema,
	ProviderDefaultRateLimits,
} from "../provider/index.js";
import {
	FrictionlessPenalties,
	PENALTY_ACCESS_RULE_DEFAULT,
	PENALTY_OLD_TIMESTAMP_DEFAULT,
} from "./frictionless.js";
import {
	DEFAULT_IMAGE_CAPTCHA_SOLUTION_TIMEOUT,
	DEFAULT_IMAGE_CAPTCHA_TIMEOUT,
	DEFAULT_IMAGE_CAPTCHA_VERIFIED_TIMEOUT,
	DEFAULT_IMAGE_MAX_VERIFIED_TIME_CACHED,
	DEFAULT_MAX_VERIFIED_TIME_CONTRACT,
	DEFAULT_POW_CAPTCHA_CACHED_TIMEOUT,
	DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT,
	DEFAULT_POW_CAPTCHA_VERIFIED_TIMEOUT,
} from "./timeouts.js";

const LogLevel = zEnum([
	"trace",
	"debug",
	"info",
	"warn",
	"error",
	"fatal",
	"log",
]);

export const DatabaseTypes = zEnum([
	"mongo",
	"mongoMemory",
	"provider",
	"client",
	"captcha",
]);

export const EnvironmentTypesSchema = zEnum([
	"development",
	"staging",
	"production",
]);

export type EnvironmentTypes = zInfer<typeof EnvironmentTypesSchema>;

export const DatabaseConfigSchema = record(
	EnvironmentTypesSchema,
	object({
		type: string(),
		endpoint: string(),
		dbname: string().default("prosopo"),
		authSource: string().default("admin"),
	}),
);

export type DatabaseConfigInput = input<typeof DatabaseConfigSchema>;
export type DatabaseConfigOutput = output<typeof DatabaseConfigSchema>;

export const ProsopoBaseConfigSchema = object({
	logLevel: LogLevel.optional().default(LogLevel.enum.info),
	defaultEnvironment: EnvironmentTypesSchema.default(
		EnvironmentTypesSchema.Values.production,
	),
	// The account with which to query the contract.merge sign transactions
	account: object({
		address: string().optional(),
		secret: string().optional(),
		password: string().optional(),
	}),
});
export const PolkadotSecretJSONSpec = z.object({
	encoded: z.string(),
	encoding: z.object({
		content: z.array(z.string()),
		type: z.array(z.string()),
		version: z.string(),
	}),
	address: z.string(),
	meta: z.object({
		genesisHash: z.string(),
		name: z.string(),
		whenCreated: z.number(),
	}),
});

export type PolkadotSecretJSON = zInfer<typeof PolkadotSecretJSONSpec>;

export const ProsopoBasicConfigSchema = ProsopoBaseConfigSchema.merge(
	object({
		database: DatabaseConfigSchema.optional(),
		devOnlyWatchEvents: boolean().optional(),
	}),
);

export type ProsopoBasicConfigInput = input<typeof ProsopoBasicConfigSchema>;
export type ProsopoBasicConfigOutput = output<typeof ProsopoBasicConfigSchema>;

export const ProsopoApiConfigSchema = object({
	baseURL: string().url(),
	port: number().optional().default(9229),
}).default({
	baseURL: "http://localhost",
	port: 9229,
});

export const ProsopoCaptchaSolutionConfigSchema = object({
	requiredNumberOfSolutions: number().positive().min(2),
	solutionWinningPercentage: number().positive().max(100),
	captchaBlockRecency: number().positive().min(2),
});

export const ProsopoClientConfigSchema = ProsopoBasicConfigSchema.merge(
	object({
		userAccountAddress: string().optional(),
		web2: boolean().optional().default(true),
		solutionThreshold: number().positive().max(100).optional().default(80),
		dappName: string().optional().default("ProsopoClientDapp"),
		serverUrl: string().optional(),
	}),
);

const defaultImageCaptchaTimeouts = {
	challengeTimeout: DEFAULT_IMAGE_CAPTCHA_TIMEOUT,
	solutionTimeout: DEFAULT_IMAGE_CAPTCHA_SOLUTION_TIMEOUT,
	verifiedTimeout: DEFAULT_IMAGE_CAPTCHA_VERIFIED_TIMEOUT,
	cachedTimeout: DEFAULT_IMAGE_MAX_VERIFIED_TIME_CACHED,
};

const defaultPoWCaptchaTimeouts = {
	challengeTimeout: DEFAULT_POW_CAPTCHA_VERIFIED_TIMEOUT,
	solutionTimeout: DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT,
	cachedTimeout: DEFAULT_POW_CAPTCHA_CACHED_TIMEOUT,
};

const defaultContractCaptchaTimeouts = {
	maxVerifiedTime: DEFAULT_MAX_VERIFIED_TIME_CONTRACT,
};

const defaultCaptchaTimeouts = {
	image: defaultImageCaptchaTimeouts,
	pow: defaultPoWCaptchaTimeouts,
	contract: defaultContractCaptchaTimeouts,
};

export const CaptchaTimeoutSchema = object({
	image: object({
		// Set this to a default value for the frontend
		challengeTimeout: number()
			.positive()
			.optional()
			.default(DEFAULT_IMAGE_CAPTCHA_TIMEOUT),
		// Set this to a default value for the frontend
		solutionTimeout: number()
			.positive()
			.optional()
			.default(DEFAULT_IMAGE_CAPTCHA_SOLUTION_TIMEOUT),
		verifiedTimeout: number()
			.positive()
			.optional()
			.default(DEFAULT_IMAGE_CAPTCHA_VERIFIED_TIMEOUT),
		cachedTimeout: number()
			.positive()
			.optional()
			.default(DEFAULT_IMAGE_MAX_VERIFIED_TIME_CACHED),
	}).default(defaultImageCaptchaTimeouts),
	pow: object({
		verifiedTimeout: number()
			.positive()
			.optional()
			.default(DEFAULT_POW_CAPTCHA_VERIFIED_TIMEOUT),
		solutionTimeout: number()
			.positive()
			.optional()
			.default(DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT),
		cachedTimeout: number()
			.positive()
			.optional()
			.default(DEFAULT_POW_CAPTCHA_CACHED_TIMEOUT),
	}).default(defaultPoWCaptchaTimeouts),
	contract: object({
		maxVerifiedTime: number()
			.positive()
			.optional()
			.default(DEFAULT_MAX_VERIFIED_TIME_CONTRACT),
	}).default(defaultContractCaptchaTimeouts),
}).default(defaultCaptchaTimeouts);

export type CaptchaTimeoutInput = input<typeof CaptchaTimeoutSchema>;

export type CaptchaTimeoutOutput = output<typeof CaptchaTimeoutSchema>;

export const ProsopoServerConfigSchema = ProsopoClientConfigSchema.merge(
	object({
		serverUrl: string().url().optional(),
		timeouts: CaptchaTimeoutSchema.optional().default(defaultCaptchaTimeouts),
	}),
);

export type ProsopoServerConfigInput = input<typeof ProsopoServerConfigSchema>;
export type ProsopoServerConfigOutput = output<
	typeof ProsopoServerConfigSchema
>;

export const AccountCreatorConfigSchema = object({
	area: object({
		width: number().positive(),
		height: number().positive(),
	}),
	offsetParameter: number().positive(),
	multiplier: number().positive(),
	fontSizeFactor: number().positive(),
	maxShadowBlur: number().positive(),
	numberOfRounds: number().positive(),
	seed: number().positive(),
});

export type ProsopoClientConfigInput = input<typeof ProsopoClientConfigSchema>;
export type ProsopoClientConfigOutput = output<
	typeof ProsopoClientConfigSchema
>;

const ThemeType = union([literal("light"), literal("dark")]);

export enum ModeEnum {
	visible = "visible",
	invisible = "invisible",
}
export const Mode = zEnum([ModeEnum.visible, ModeEnum.invisible]).optional();
export type ModeType = zInfer<typeof Mode>;

export const ProcaptchaConfigSchema = ProsopoClientConfigSchema.and(
	object({
		theme: ThemeType.optional().default("light"),
		captchas: CaptchaTimeoutSchema.optional().default(defaultCaptchaTimeouts),
		language: LanguageSchema.optional(),
		mode: Mode.optional().default(ModeEnum.visible),
	}),
);

export type ProcaptchaClientConfigInput = input<typeof ProcaptchaConfigSchema>;
export type ProcaptchaClientConfigOutput = output<
	typeof ProcaptchaConfigSchema
>;

export const ProsopoConfigSchema = ProsopoBasicConfigSchema.merge(
	object({
		captchas: ProsopoCaptchaCountConfigSchema.optional().default({
			solved: { count: DEFAULT_SOLVED_COUNT },
			unsolved: { count: DEFAULT_UNSOLVED_COUNT },
		}),
		penalties: FrictionlessPenalties.optional().default({
			PENALTY_OLD_TIMESTAMP: PENALTY_OLD_TIMESTAMP_DEFAULT,
			PENALTY_ACCESS_RULE: PENALTY_ACCESS_RULE_DEFAULT,
		}),
		scheduledTasks: object({
			captchaScheduler: object({
				schedule: string().optional(),
			}).optional(),
			clientListScheduler: object({
				schedule: string().optional(),
			}).optional(),
		}).optional(),
		server: ProsopoApiConfigSchema.optional(),
		mongoEventsUri: string().optional(),
		mongoCaptchaUri: string().optional(),
		mongoClientUri: string().optional(),
		redisConnection: object({
			url: string(),
			password: string(),
			indexName: string().optional(),
		}).default({
			url: "redis://localhost:6379",
			password: "root",
		}),
		rateLimits: ApiPathRateLimits.default(ProviderDefaultRateLimits),
		proxyCount: number().optional().default(0),
		lRules: record(string(), number()).optional(),
		authAccount: object({
			address: string().optional(),
			secret: string().optional(),
			password: string().optional(),
		}),
	}),
);

export type ProsopoConfigInput = input<typeof ProsopoConfigSchema>;
export type ProsopoConfigOutput = output<typeof ProsopoConfigSchema>;
