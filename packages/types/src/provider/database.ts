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

import type { TranslationKey } from "@prosopo/locale";
import {
	type ZodType,
	any,
	array,
	bigint,
	boolean,
	date,
	nativeEnum,
	number,
	object,
	string,
	tuple,
	type infer as zInfer,
} from "zod";
import { CaptchaType } from "../client/index.js";
import type { ContextType } from "../client/settings.js";
import {
	type CaptchaResult,
	type CaptchaSolution,
	CaptchaSolutionSchema,
	CaptchaStatus,
	type PoWCaptchaUser,
	PowChallengeIdSchema,
} from "../datasets/index.js";
import type {
	DecisionMachineLanguage,
	DecisionMachineRuntime,
	DecisionMachineScope,
} from "../decisionMachine/index.js";
import type { IPInfoResponse } from "../api/ipapi.js";
import type { RequestHeaders } from "./api.js";

export interface BrowserInfo {
	name: string;
	version?: string;
	major?: string;
	type?: string;
}

export interface CPUInfo {
	architecture?: string;
}

export interface DeviceInfo {
	vendor?: string;
	model?: string;
	type?: string;
}

export interface EngineInfo {
	name?: string;
	version?: string;
}

export interface OSInfo {
	name: string;
	version?: string;
}

export interface UserAgentInfo {
	ua: string;
	browser: BrowserInfo;
	cpu: CPUInfo;
	device: DeviceInfo;
	engine: EngineInfo;
	os: OSInfo;
}

export enum IpAddressType {
	v4 = "v4",
	v6 = "v6",
}

export interface CompositeIpAddress {
	// mongoose accepts "BigInt", but returns "number" from the DB
	lower: number | bigint; // IPv4 OR Low IPv6 Bits
	upper?: number | bigint; // High IPv6 Bits
	type: IpAddressType;
}

export const CompositeIpAddressSchema = object({
	lower: bigint(),
	upper: bigint().optional(),
	type: nativeEnum(IpAddressType),
});

export type MongooseCompositeIpAddress = {
	lower: { $numberDecimal: string };
	upper?: { $numberDecimal: string };
	type: IpAddressType;
};

export const parseMongooseCompositeIpAddress = (
	ip: MongooseCompositeIpAddress,
): CompositeIpAddress => {
	return {
		lower: BigInt(ip.lower.$numberDecimal ?? ip.lower),
		upper: ip.upper ? BigInt(ip.upper?.$numberDecimal ?? ip.upper) : undefined,
		type: ip.type,
	};
};

/**
 * Packed behavioral data format for efficient storage
 * c1: Mouse movement data (packed with delta encoding)
 * c2: Touch event data (packed with delta encoding)
 * c3: Click event data (packed with delta encoding)
 * d: Device capability string
 */
export interface BehavioralDataPacked {
	c1: unknown[];
	c2: unknown[];
	c3: unknown[];
	d: string;
}

export interface StoredCaptcha {
	result: {
		status: CaptchaStatus;
		reason?: TranslationKey;
		error?: string;
	};
	requestedAtTimestamp: Date;
	ipAddress: CompositeIpAddress;
	providedIp?: CompositeIpAddress;
	headers: RequestHeaders;
	ja4: string;
	userSubmitted: boolean;
	serverChecked: boolean;
	geolocation?: string;
	countryCode?: string;
	vpn?: boolean;
	ipInfo?: IPInfoResponse;
	parsedUserAgentInfo?: UserAgentInfo;
	storedAtTimestamp?: Date;
	lastUpdatedTimestamp?: Date;
	sessionId?: string;
	coords?: [number, number][][];
	// Legacy fields - kept for backward compatibility with existing data
	mouseEvents?: Array<Record<string, unknown>>;
	touchEvents?: Array<Record<string, unknown>>;
	clickEvents?: Array<Record<string, unknown>>;
	// Current behavioral data storage format (packed)
	deviceCapability?: string;
	behavioralDataPacked?: BehavioralDataPacked;
}

export interface UserCommitment extends StoredCaptcha {
	userAccount: string;
	dappAccount: string;
	datasetId: string;
	providerAccount: string;
	id: string;
	pending: boolean;
	userSignature: string;
	salt: string;
	requestHash: string;
	threshold: number;
	deadlineTimestamp: Date;
}

const CaptchaResultSchema = object({
	status: nativeEnum(CaptchaStatus),
	reason: string().optional(), // Should be translation key but DecisionMachines submit random strings as reason, so we can't validate against TranslationKeysSchema here
	error: string().optional(),
}) satisfies ZodType<CaptchaResult>;

// Zod schema for BehavioralDataPacked
const BehavioralDataPackedSchema = object({
	c1: array(any()),
	c2: array(any()),
	c3: array(any()),
	d: string(),
});

export const UserCommitmentSchema = object({
	userAccount: string(),
	dappAccount: string(),
	datasetId: string(),
	providerAccount: string(),
	id: string(),
	result: CaptchaResultSchema,
	userSignature: string(),
	ipAddress: CompositeIpAddressSchema,
	providedIp: CompositeIpAddressSchema.optional(),
	headers: object({}).catchall(string()),
	ja4: string(),
	userSubmitted: boolean(),
	serverChecked: boolean(),
	storedAtTimestamp: date().optional(),
	requestedAtTimestamp: date(),
	lastUpdatedTimestamp: date().optional(),
	sessionId: string().optional(),
	coords: array(array(tuple([number(), number()]))).optional(),
	// Pending request fields for image captcha workflow
	pending: boolean(),
	salt: string(),
	requestHash: string(),
	deadlineTimestamp: date(),
	threshold: number(),
	// Behavioral data fields
	deviceCapability: string().optional(),
	behavioralDataPacked: BehavioralDataPackedSchema.optional(),
}) satisfies ZodType<UserCommitment>;

// Zod schema for ScoreComponents
export const ScoreComponentsSchema = object({
	baseScore: number(),
	lScore: number().optional(),
	timeout: number().optional(),
	accessPolicy: number().optional(),
	unverifiedHost: number().optional(),
	webView: number().optional(),
});

export interface ScoreComponents {
	baseScore: number;
	lScore?: number;
	timeout?: number;
	accessPolicy?: number;
	unverifiedHost?: number;
	webView?: number;
}

// Zod schema for Session
export const SessionSchema = object({
	sessionId: string(),
	createdAt: date(),
	token: string(),
	score: number(),
	threshold: number(),
	scoreComponents: ScoreComponentsSchema,
	providerSelectEntropy: number(),
	ipAddress: CompositeIpAddressSchema,
	captchaType: nativeEnum(CaptchaType),
	solvedImagesCount: number().optional(),
	powDifficulty: number().optional(),
	storedAtTimestamp: date().optional(),
	lastUpdatedTimestamp: date().optional(),
	deleted: boolean().optional(),
	userSitekeyIpHash: string().optional(),
	webView: boolean(),
	iFrame: boolean(),
	decryptedHeadHash: string(),
	siteKey: string().optional(),
	reason: string().optional(),
	blocked: boolean().optional(),
	countryCode: string().optional(),
	geolocation: string().optional(),
	headers: object({}).catchall(string()),
}) satisfies ZodType<Session>;

// Session now includes all frictionless token fields
export type Session = {
	sessionId: string;
	createdAt: Date;
	token: string;
	score: number;
	threshold: number;
	scoreComponents: ScoreComponents;
	providerSelectEntropy: number;
	ipAddress: CompositeIpAddress;
	captchaType: CaptchaType;
	solvedImagesCount?: number;
	powDifficulty?: number;
	storedAtTimestamp?: Date;
	lastUpdatedTimestamp?: Date;
	deleted?: boolean;
	userSitekeyIpHash?: string;
	webView: boolean;
	iFrame: boolean;
	decryptedHeadHash: string;
	siteKey?: string;
	reason?: string;
	blocked?: boolean;
	countryCode?: string;
	geolocation?: string;
	headers?: RequestHeaders;
};

// Zod schema for PoWCaptchaStored
// PoWCaptchaStored = PoWCaptchaUser (minus requestedAtTimestamp) + StoredCaptcha
// Note: challenge uses PowChallengeIdSchema for runtime validation
// The PoWCaptchaStored interface enforces the PoWChallengeId template literal type at compile time
export const PoWCaptchaStoredSchema = object({
	// From PoWCaptchaUser (extends PoWCaptcha)
	challenge: PowChallengeIdSchema,
	difficulty: number(),
	providerSignature: string(),
	userSignature: string().optional(),
	score: number().optional(),
	userAccount: string(),
	dappAccount: string(),
	// From StoredCaptcha
	result: CaptchaResultSchema,
	requestedAtTimestamp: date(),
	ipAddress: CompositeIpAddressSchema,
	providedIp: CompositeIpAddressSchema.optional(),
	headers: object({}).catchall(string()),
	ja4: string(),
	userSubmitted: boolean(),
	serverChecked: boolean(),
	geolocation: string().optional(),
	countryCode: string().optional(),
	vpn: boolean().optional(),
	parsedUserAgentInfo: any().optional(),
	storedAtTimestamp: date().optional(),
	lastUpdatedTimestamp: date().optional(),
	sessionId: string().optional(),
	coords: array(array(tuple([number(), number()]))).optional(),
	mouseEvents: array(object({}).catchall(any())).optional(),
	touchEvents: array(object({}).catchall(any())).optional(),
	clickEvents: array(object({}).catchall(any())).optional(),
	deviceCapability: string().optional(),
	behavioralDataPacked: BehavioralDataPackedSchema.optional(),
}) satisfies ZodType<PoWCaptchaStored>;

export type PendingImageCaptchaRequest = {
	dappAccount: string;
	pending: boolean;
	salt: string;
	requestHash: string;
	deadlineTimestamp: Date;
	requestedAtTimestamp: Date;
	ipAddress: CompositeIpAddress;
	sessionId?: string;
	threshold: number;
};

export interface PoWCaptchaStored
	extends Omit<PoWCaptchaUser, "requestedAtTimestamp">,
		StoredCaptcha {}

export interface SolutionRecord extends CaptchaSolution {
	datasetId: string;
	datasetContentId: string;
}

export const UserSolutionSchema = CaptchaSolutionSchema.extend({
	processed: boolean(),
	checked: boolean(),
	commitmentId: string(),
	createdAt: date(),
});

export type UserSolution = zInfer<typeof UserSolutionSchema>;

export const UserCommitmentWithSolutionsSchema = UserCommitmentSchema.extend({
	captchas: array(UserSolutionSchema),
});

export type UserCommitmentWithSolutions = zInfer<
	typeof UserCommitmentWithSolutionsSchema
>;

export type DetectorKey = {
	detectorKey: string;
	createdAt: Date;
	expiresAt?: Date;
};

/**
 * Decision machine artifact stored in the database.
 * The combination of scope + dappAccount uniquely identifies one artifact.
 *
 * Examples:
 * - Global scope: { scope: "global", dappAccount: null }
 * - Dapp scope: { scope: "dapp", dappAccount: "0x123..." }
 *
 * Future scope extensions (e.g., device type) would add additional fields
 * to this composite key to maintain uniqueness.
 *
 */
export type DecisionMachineArtifact = {
	scope: DecisionMachineScope;
	dappAccount?: string;
	runtime: DecisionMachineRuntime;
	language?: DecisionMachineLanguage;
	source: string;
	name?: string;
	version?: string;
	captchaType?: CaptchaType.pow | CaptchaType.image;
	createdAt: Date;
	updatedAt: Date;
};

export type ClientContextEntropy = {
	account: string;
	contextType: ContextType;
	entropy: string;
	createdAt: Date;
	updatedAt: Date;
};
