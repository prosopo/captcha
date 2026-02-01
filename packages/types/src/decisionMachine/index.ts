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

import { z } from "zod";
import type { CaptchaType } from "../client/index.js";
import { CaptchaTypeSchema } from "../client/index.js";

export enum DecisionMachineRuntime {
	Node = "node",
}

/**
 * Decision machine scope defines the specificity level of an artifact.
 * Only ONE artifact is selected per request based on scope priority.
 *
 * Current scopes (priority order):
 * - Dapp: Custom decision machine for a specific dapp (highest priority)
 * - Global: Default decision machine applied to all dapps (fallback)
 *
 * Future extensibility: Additional scopes can be added for device type
 * (mobile/desktop/app), geographic region, user tier, etc. New scopes
 * would be evaluated in priority order to maintain single-artifact execution.
 */
export enum DecisionMachineScope {
	Global = "global",
	Dapp = "dapp",
}

export enum DecisionMachineLanguage {
	JavaScript = "js",
	TypeScript = "ts",
}

export enum DecisionMachineDecision {
	Allow = "allow",
	Deny = "deny",
}

export type DecisionMachineBehavioralDataPacked = {
	c1: unknown[];
	c2: unknown[];
	c3: unknown[];
	d: string;
};

export type DecisionMachineInput = {
	userAccount: string;
	dappAccount: string;
	captchaResult: "passed" | "failed";
	headers: Record<string, string | string[] | undefined>;
	captchaType?: CaptchaType.pow | CaptchaType.image
	behavioralDataPacked?: DecisionMachineBehavioralDataPacked;
	deviceCapability?: string;
};

export type DecisionMachineOutput = {
	decision: DecisionMachineDecision;
	reason?: string;
	score?: number;
	tags?: string[];
};

export type DecisionMachineArtifact = {
	runtime: DecisionMachineRuntime;
	source: string;
	language?: DecisionMachineLanguage;
	name?: string;
	version?: string;
	createdAt: string;
	captchaType?: CaptchaType.pow | CaptchaType.image
};

export const DecisionMachineOutputSchema = z.object({
	decision: z.nativeEnum(DecisionMachineDecision),
	reason: z.string().optional(),
	score: z.number().optional(),
	tags: z.array(z.string()).optional(),
});

export const DecisionMachineArtifactSchema = z.object({
	runtime: z.nativeEnum(DecisionMachineRuntime),
	source: z.string(),
	language: z.nativeEnum(DecisionMachineLanguage).optional(),
	name: z.string().optional(),
	version: z.string().optional(),
	createdAt: z.string(),
	captchaType: CaptchaTypeSchema.optional(),
});
