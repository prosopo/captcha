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
import { array, boolean, number, object, type output, string, z } from "zod";
import { CaptchaType } from "./captchaType/captchaType.js";
import { CaptchaTypeSpec } from "./captchaType/captchaTypeSpec.js";

export const captchaTypeDefault = CaptchaType.frictionless;
export const domainsDefault: string[] = [];
export const frictionlessThresholdDefault = 0.5;
export const powDifficultyDefault = 4;
export const imageThresholdDefault = 0.8;
export const contextAwareThresholdDefault = 0.85;

// IP Validation Rules
export enum IPValidationAction {
	Allow = "allow",
	Reject = "reject",
	Flag = "flag",
}

export type IPValidateCondition = {
	met: boolean;
	action: IPValidationAction;
	message: string;
};

export const IPValidationActionSchema = z.nativeEnum(IPValidationAction);

// IP Validation defaults
export const countryChangeActionDefault = IPValidationAction.Allow;
export const cityChangeActionDefault = IPValidationAction.Allow;
export const ispChangeActionDefault = IPValidationAction.Allow;
export const distanceThresholdKmDefault = 1000;
export const abuseScoreThresholdDefault = 0.005;
export const distanceExceedActionDefault = IPValidationAction.Reject;
export const abuseScoreThresholdExceedActionDefault = IPValidationAction.Reject;
export const requireAllConditionsDefault = false;

const IPValidationSchema = object({
	actions: object({
		countryChangeAction: IPValidationActionSchema.optional(),
		cityChangeAction: IPValidationActionSchema.optional(),
		ispChangeAction: IPValidationActionSchema.optional(),
		distanceExceedAction: IPValidationActionSchema.optional(),
		abuseScoreExceedAction: IPValidationActionSchema.optional(),
	}).partial(), // all optional, so you can just override what you need

	distanceThresholdKm: number().positive().optional(),
	abuseScoreThreshold: number().positive().optional(),
	requireAllConditions: boolean().optional(),
});

export const IPValidationRulesSchema = object({
	actions: object({
		countryChangeAction: IPValidationActionSchema.optional().default(
			countryChangeActionDefault,
		),
		cityChangeAction: IPValidationActionSchema.optional().default(
			cityChangeActionDefault,
		),
		ispChangeAction: IPValidationActionSchema.optional().default(
			ispChangeActionDefault,
		),
		distanceExceedAction: IPValidationActionSchema.optional().default(
			distanceExceedActionDefault,
		),
		abuseScoreExceedAction: IPValidationActionSchema.optional().default(
			abuseScoreThresholdExceedActionDefault,
		),
	}),
	distanceThresholdKm: number()
		.positive()
		.optional()
		.default(distanceThresholdKmDefault),
	abuseScoreThreshold: number()
		.positive()
		.optional()
		.default(abuseScoreThresholdDefault),
	requireAllConditions: z
		.boolean()
		.optional()
		.default(requireAllConditionsDefault),
	// overrides are now lightweight, not recursive
	countryOverrides: z.record(string(), IPValidationSchema).optional(),
	forceConsistentIp: boolean().optional().default(false),
});

export const ClientSettingsSchema = object({
	captchaType: CaptchaTypeSpec.optional().default(captchaTypeDefault),
	domains: array(string())
		.optional()
		.default([...domainsDefault]),
	frictionlessThreshold: number()
		.optional()
		.default(frictionlessThresholdDefault),
	powDifficulty: number().optional().default(powDifficultyDefault),
	imageThreshold: number().optional().default(imageThresholdDefault),
	ipValidationRules: IPValidationRulesSchema.optional(),
	disallowWebView: boolean().optional().default(false).optional(),
	contextAware: z
		.object({
			enabled: boolean().optional().default(false),
			threshold: number().optional().default(contextAwareThresholdDefault),
		})
		.optional(),
});

export type IUserSettings = output<typeof ClientSettingsSchema>;
export type IIPValidationRules = output<typeof IPValidationRulesSchema>;
export type IIPValidation = output<typeof IPValidationSchema>;
