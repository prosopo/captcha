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
import {
	CaptchaType,
	DecisionMachineCaptchaTypeSchema,
} from "../client/captchaType/captchaType.js";
import type { RequestHeaders } from "../provider/api.js";

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
	phase?: "verify";
	userAccount: string;
	dappAccount: string;
	captchaResult: "passed" | "failed";
	headers: Record<string, string | string[] | undefined>;
	captchaType?: CaptchaType.pow | CaptchaType.image | CaptchaType.puzzle;
	behavioralDataPacked?: DecisionMachineBehavioralDataPacked;
	deviceCapability?: string;
	countryCode?: string;
};

export type DecisionMachineOutput = {
	decision: DecisionMachineDecision;
	reason?: string;
	score?: number;
	tags?: string[];
};

export type DecisionMachineCaptchaType =
	| CaptchaType.pow
	| CaptchaType.image
	| CaptchaType.puzzle;

// This is the API configuration type (used for uploads/API calls)
// The database storage type is DecisionMachineArtifact in provider/database.ts
export type DecisionMachineConfig = {
	runtime: DecisionMachineRuntime;
	source: string;
	language?: DecisionMachineLanguage;
	name?: string;
	version?: string;
	createdAt: string;
	captchaType?: DecisionMachineCaptchaType;
};

export const DecisionMachineOutputSchema = z.object({
	decision: z.nativeEnum(DecisionMachineDecision),
	reason: z.string().optional(),
	score: z.number().optional(),
	tags: z.array(z.string()).optional(),
});

export const DecisionMachineConfigSchema = z.object({
	runtime: z.nativeEnum(DecisionMachineRuntime),
	source: z.string(),
	language: z.nativeEnum(DecisionMachineLanguage).optional(),
	name: z.string().optional(),
	version: z.string().optional(),
	createdAt: z.string(),
	captchaType: DecisionMachineCaptchaTypeSchema.optional(),
});

/**
 * Routing decision machines: select the concrete captcha type for a frictionless
 * request based on baseline (from the ladder), pre-derived platform flags, and
 * per-sitekey Redis usage counters. Failure modes (missing machine, throw,
 * timeout, invalid output) fall back to the baseline.
 */

export const COUNTER_WINDOWS = ["1m", "10m", "1h", "3h", "6h", "24h"] as const;
export type CounterWindow = (typeof COUNTER_WINDOWS)[number];

export const COUNTER_WINDOW_SECONDS: Record<CounterWindow, number> = {
	"1m": 60,
	"10m": 600,
	"1h": 3600,
	"3h": 10800,
	"6h": 21600,
	"24h": 86400,
};

export const COUNTER_KINDS = ["served", "solved"] as const;
export type CounterKind = (typeof COUNTER_KINDS)[number];

export const COUNTER_DIMENSIONS = ["ip", "userAccount"] as const;
export type CounterDimension = (typeof COUNTER_DIMENSIONS)[number];

export const COUNTER_CAPTCHA_ANY = "any" as const;
export type CounterCaptchaType =
	| CaptchaType.pow
	| CaptchaType.image
	| CaptchaType.puzzle
	| typeof COUNTER_CAPTCHA_ANY;

export interface CounterSpec {
	kind: CounterKind;
	captchaType: CounterCaptchaType;
	dimension: CounterDimension;
	window: CounterWindow;
}

export const CounterSpecSchema = z.object({
	kind: z.enum(COUNTER_KINDS),
	captchaType: z.union([
		z.literal(CaptchaType.pow),
		z.literal(CaptchaType.image),
		z.literal(CaptchaType.puzzle),
		z.literal(COUNTER_CAPTCHA_ANY),
	]),
	dimension: z.enum(COUNTER_DIMENSIONS),
	window: z.enum(COUNTER_WINDOWS),
});

export const encodeCounterKey = (
	dappAccount: string,
	spec: CounterSpec,
	value: string,
): string =>
	`cnt:${dappAccount}:${spec.kind}:${spec.captchaType}:${spec.dimension}:${value}:${spec.window}`;

export interface RoutingMachineBaseline {
	captchaType: CaptchaType.pow | CaptchaType.image | CaptchaType.puzzle;
	solvedImagesCount?: number;
	powDifficulty?: number;
}

export interface RoutingMachinePlatform {
	isApple: boolean;
	isWebView: boolean;
	isMobile: boolean;
}

export interface RoutingMachineRawSignals {
	headers: RequestHeaders;
	userAgent: string;
	ja4?: string;
	behavioralDataPacked?: DecisionMachineBehavioralDataPacked;
}

export interface RoutingMachineInputBase {
	phase: "route";
	dappAccount: string;
	userAccount: string;
	ip: string;
	countryCode?: string;
	baseline: RoutingMachineBaseline;
	score: number;
	platform: RoutingMachinePlatform;
	raw: RoutingMachineRawSignals;
}

export interface RoutingMachineInput extends RoutingMachineInputBase {
	counters: Record<string, number>;
}

export interface RoutingMachineOutput {
	captchaType: CaptchaType.pow | CaptchaType.image | CaptchaType.puzzle;
	solvedImagesCount?: number;
	powDifficulty?: number;
}

export const RoutingMachineOutputSchema = z.object({
	captchaType: z.union([
		z.literal(CaptchaType.pow),
		z.literal(CaptchaType.image),
		z.literal(CaptchaType.puzzle),
	]),
	solvedImagesCount: z.number().int().positive().optional(),
	powDifficulty: z.number().int().positive().optional(),
});
