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

import {
	type ZodType,
	type ZodTypeDef,
	any,
	array,
	bigint,
	boolean,
	date,
	literal,
	nativeEnum,
	number,
	object,
	string,
	tuple,
	union,
	type infer as zInfer,
} from "zod";
import type { IPInfoResponse } from "../api/ipapi.js";
import { CaptchaType } from "../client/index.js";
import type { ContextType } from "../client/settings.js";
import { ModeEnum } from "../config/mode.js";
import {
	type CaptchaResult,
	type CaptchaSolution,
	CaptchaSolutionSchema,
	CaptchaStatus,
	type PoWCaptchaUser,
	type PoWChallengeId,
	PowChallengeIdSchema,
} from "../datasets/index.js";
import type {
	DecisionMachineLanguage,
	DecisionMachineRuntime,
	DecisionMachineScope,
} from "../decisionMachine/index.js";
import type { PuzzleEvent, RequestHeaders } from "./api.js";
import type { SimdReadings } from "./detection.js";
import type { FrictionlessReason, ResultReason } from "./reasons.js";

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

// Dapp-server-forwarded metadata that the captcha record optionally
// captures. Only populated when the site key has
// `settings.storeMetadata = true` — off by default. New fields are added
// here as the verify payload grows; `providedIp` stays top-level for
// backwards compatibility (existing data and indexes already use it).
export interface StoredCaptchaMetadata {
	email?: string;
}

// Widget-controlled metadata captured during the captcha solution submission.
// Always persisted when present (not gated by `storeMetadata`) — this is a
// signal channel for the honeypot (and any future widget-side traps).
export interface ClientMetaData {
	hp?: string;
}

/**
 * Internal classification labels applied by superadmins from the audit page to
 * build supervised ML training sets. Stored directly on the captcha record
 * (see {@link StoredCaptcha.label}); not part of the captcha verification flow.
 */
export enum CaptchaLabel {
	human = "human",
	bot = "bot",
	suspicious = "suspicious",
	unknown = "unknown",
}

export const CaptchaLabelSchema = nativeEnum(CaptchaLabel);

export interface StoredCaptcha {
	result: {
		status: CaptchaStatus;
		reason?: ResultReason;
		error?: string;
	};
	requestedAtTimestamp: Date;
	ipAddress: CompositeIpAddress;
	providedIp?: CompositeIpAddress;
	metadata?: StoredCaptchaMetadata;
	clientMetaData?: ClientMetaData;
	headers: RequestHeaders;
	ja4: string;
	userSubmitted: boolean;
	serverChecked: boolean;
	// The full ipinfo payload from `IpInfoService.lookup()`. Persisted
	// either by the provider's ipInfoMiddleware (at request time) or by
	// the CHECK_IP_INFO backfill job. Consumers read individual fields
	// (`isVPN`, `countryCode`, `isTor`, ...) directly off this object
	// after narrowing on `isValid`, instead of having one flat top-level
	// field per signal. Optional for records written before the
	// middleware existed; backfill fills them in over time.
	ipInfo?: IPInfoResponse;
	parsedUserAgentInfo?: UserAgentInfo;
	storedAtTimestamp?: Date;
	lastUpdatedTimestamp?: Date;
	// Sentinel for the central-DB sweep. `true` when the record has unstaged
	// changes (never staged, or mutated after the last stage). Unset by
	// `markXxxStored` after a successful stage (guarded so an in-flight update
	// isn't accidentally cleared). Allows the sweep to scan a tiny partial
	// index instead of $or'ing `{storedAtTimestamp:{$exists:false}}` with an
	// unindexable $expr branch.
	pendingStage?: boolean;
	sessionId?: string;
	coords?: [number, number][][];
	// Legacy fields - kept for backward compatibility with existing data
	mouseEvents?: Array<Record<string, unknown>>;
	touchEvents?: Array<Record<string, unknown>>;
	clickEvents?: Array<Record<string, unknown>>;
	// Current behavioral data storage format (packed)
	deviceCapability?: string;
	behavioralDataPacked?: BehavioralDataPacked;
	// Internal ML labelling, written by superadmins via the audit page. Not part
	// of the captcha verification flow; used to build supervised training sets.
	// See `CaptchaLabel`.
	label?: CaptchaLabel;
	labelReason?: string;
	labelledBy?: string;
	labelledAt?: Date;
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

// Runtime parsing stays permissive (`string().optional()`) because decision
// machines are operator-authored JS — their `reason` is whatever string the
// machine returns, including values that won't be in `ResultReason`. The
// strict `ResultReason` type is preserved at the schema's output via
// `.transform`, so callers still see the canonical enum on the TS surface
// while old/foreign records still parse without throwing.
const CaptchaResultSchema = object({
	status: nativeEnum(CaptchaStatus),
	reason: string()
		.optional()
		.transform((v) => v as ResultReason | undefined),
	error: string().optional(),
}) satisfies ZodType<CaptchaResult, ZodTypeDef, unknown>;

// Zod schema for BehavioralDataPacked
const BehavioralDataPackedSchema = object({
	c1: array(any()),
	c2: array(any()),
	c3: array(any()),
	d: string(),
});

export const StoredCaptchaMetadataSchema = object({
	email: string().optional(),
}) satisfies ZodType<StoredCaptchaMetadata, ZodTypeDef, unknown>;

export const ClientMetaDataDbSchema = object({
	hp: string().optional(),
}) satisfies ZodType<ClientMetaData, ZodTypeDef, unknown>;

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
	metadata: StoredCaptchaMetadataSchema.optional(),
	clientMetaData: ClientMetaDataDbSchema.optional(),
	headers: object({}).catchall(string()),
	ja4: string(),
	userSubmitted: boolean(),
	serverChecked: boolean(),
	storedAtTimestamp: date().optional(),
	requestedAtTimestamp: date(),
	lastUpdatedTimestamp: date().optional(),
	pendingStage: boolean().optional(),
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
	// Internal ML labelling (see StoredCaptcha.label)
	label: CaptchaLabelSchema.optional(),
	labelReason: string().optional(),
	labelledBy: string().optional(),
	labelledAt: date().optional(),
}) satisfies ZodType<UserCommitment, ZodTypeDef, unknown>;

// Zod schema for ScoreComponents
export const ScoreComponentsSchema = object({
	baseScore: number(),
	lScore: number().optional(),
	timeout: number().optional(),
	accessPolicy: number().optional(),
	unverifiedHost: number().optional(),
	webView: number().optional(),
	triggeredDetectors: array(number()).optional(),
	shadowDomPenalty: boolean().optional(),
	dnsAsymmetry: number().optional(),
});

// Zod schema for the WASM SIMD CPU fingerprint readings collected by the
// catcher client and forwarded in the encrypted payload. Mirrors the
// `SimdReadings` discriminated union in ./detection.ts.
const SimdOpReadingRecordSchema = object({
	name: string(),
	category: nativeEnum({
		FP: "FP",
		INT: "INT",
		BIT: "BIT",
		PERM: "PERM",
	} as const),
	bestNs: number(),
	medianNs: number(),
	iters: number(),
	resultLane: number(),
});

export const SimdReadingsSchema = union([
	object({
		supported: literal(false),
		reason: string(),
	}),
	object({
		supported: literal(true),
		schema: number(),
		timerResolutionMs: number(),
		runsPerOp: number(),
		durationMs: number(),
		ops: array(SimdOpReadingRecordSchema),
	}),
]);

// Stage at which the catcher's SIMD readings first reached the provider.
// Tracked once on the Session record (first hop wins) so analytics can see
// when in the user's journey the CPU fingerprint became available.
export enum SimdReadingsStage {
	frictionless = "frictionless",
	challenge = "challenge",
	submit = "submit",
}

export const SimdReadingsStageSchema = nativeEnum(SimdReadingsStage);

export interface ScoreComponents {
	baseScore: number;
	lScore?: number;
	timeout?: number;
	accessPolicy?: number;
	unverifiedHost?: number;
	webView?: number;
	triggeredDetectors?: number[];
	shadowDomPenalty?: boolean;
	dnsAsymmetry?: number;
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
	mode: nativeEnum(ModeEnum).optional(),
	solvedImagesCount: number().optional(),
	powDifficulty: number().optional(),
	storedAtTimestamp: date().optional(),
	lastUpdatedTimestamp: date().optional(),
	pendingStage: boolean().optional(),
	deleted: boolean().optional(),
	userSitekeyIpHash: string().optional(),
	webView: boolean(),
	iFrame: boolean(),
	decryptedHeadHash: string(),
	siteKey: string().optional(),
	// Selection reason: writes go through `FrictionlessReason`, but the
	// schema accepts any string at runtime so old records (or unforeseen
	// values) still parse. Output type is cast back to the enum so the
	// TS surface stays strict.
	reason: string()
		.optional()
		.transform((v) => v as FrictionlessReason | undefined),
	blocked: boolean().optional(),
	// Full ipinfo payload from ipInfoMiddleware at session-creation
	// time. Replaces the flat `countryCode` / `geolocation` fields —
	// consumers narrow on `ipInfo.isValid` and read whichever sub-field
	// they need (countryCode, isVPN, etc.). Mirrors what's stored on
	// captcha records (PoW / Puzzle / UserCommitment).
	ipInfo: any().optional(),
	headers: object({}).catchall(string()),
	result: object({
		status: nativeEnum(CaptchaStatus),
		// See the comment on `CaptchaResultSchema.reason`: permissive at
		// runtime, cast back to `ResultReason` on the TS surface.
		reason: string()
			.optional()
			.transform((v) => v as ResultReason | undefined),
		error: string().optional(),
	}).optional(),
	userSubmitted: boolean().optional(),
	serverChecked: boolean().optional(),
	// WASM SIMD CPU fingerprint readings. Collection-only — used to build the
	// training dataset for later classification. Absent on older clients.
	simdReadings: SimdReadingsSchema.optional(),
	// Stage at which the readings first arrived. First-hop-wins so the
	// indicator reflects when the catcher's CPU fingerprint became
	// available relative to the user's journey.
	simdReadingsStage: SimdReadingsStageSchema.optional(),
	dnsEvent: object({
		resolverIp: string().optional(),
		peerIp: string().optional(),
		pathValid: boolean().optional(),
		receivedAt: date(),
	}).optional(),
}) satisfies ZodType<Session, ZodTypeDef, unknown>;

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
	mode?: ModeEnum;
	solvedImagesCount?: number;
	powDifficulty?: number;
	storedAtTimestamp?: Date;
	lastUpdatedTimestamp?: Date;
	// See StoredCaptcha.pendingStage — same semantics on Session records.
	pendingStage?: boolean;
	deleted?: boolean;
	userSitekeyIpHash?: string;
	webView: boolean;
	iFrame: boolean;
	decryptedHeadHash: string;
	siteKey?: string;
	reason?: FrictionlessReason;
	blocked?: boolean;
	// Full ipinfo payload from ipInfoMiddleware at session-creation
	// time. Replaces the flat `countryCode` / `geolocation` fields.
	ipInfo?: IPInfoResponse;
	headers?: RequestHeaders;
	result?: {
		status: CaptchaStatus;
		reason?: ResultReason;
		error?: string;
	};
	userSubmitted?: boolean;
	serverChecked?: boolean;
	// WASM SIMD CPU fingerprint readings forwarded by the catcher client.
	simdReadings?: SimdReadings;
	// Stage at which the readings first arrived.
	simdReadingsStage?: SimdReadingsStage;
	// DNS observation merge target — populated by the dns-event sidecar
	// via POST /v1/prosopo/provider/admin/dns/event. At most one DNS
	// event + one HTTP event per session under normal usage; the
	// resolver/peer IP mismatch is the signal that flags a residential
	// proxy that doesn't tunnel DNS.
	dnsEvent?: {
		// Source IP of the UDP/53 query that hit the auth nameserver for
		// {sessionId}.{subzone}. That's the resolver the user's proxy
		// chain actually used — leaks even when HTTP traffic is proxied.
		resolverIp?: string;
		// Peer IP of the TLS connection that hit the pixel endpoint. The
		// proxy exit IP from the user's perspective.
		peerIp?: string;
		// True iff the HTTPS request path matched HMAC(sessionId, secret).
		// False indicates a scanner / replayed sessionId / wrong secret.
		pathValid?: boolean;
		// Wall-clock time the first event for this session was received
		// by the provider. Subsequent events update the individual fields
		// above but don't bump this timestamp.
		receivedAt: Date;
	};
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
	metadata: StoredCaptchaMetadataSchema.optional(),
	clientMetaData: ClientMetaDataDbSchema.optional(),
	headers: object({}).catchall(string()),
	ja4: string(),
	userSubmitted: boolean(),
	serverChecked: boolean(),
	// The full ipinfo payload — optional and not validated nominally
	// because IPInfoResponse is a discriminated union and consumers
	// only need to narrow at read time.
	ipInfo: any().optional(),
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
	// Internal ML labelling (see StoredCaptcha.label)
	label: CaptchaLabelSchema.optional(),
	labelReason: string().optional(),
	labelledBy: string().optional(),
	labelledAt: date().optional(),
}) satisfies ZodType<PoWCaptchaStored, ZodTypeDef, unknown>;

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

export interface PuzzleCaptchaStored extends StoredCaptcha {
	challenge: PoWChallengeId;
	targetX: number;
	targetY: number;
	originX: number;
	originY: number;
	tolerance: number;
	providerSignature: string;
	userSignature?: string;
	userAccount: string;
	dappAccount: string;
	puzzleEvents?: PuzzleEvent[];
}

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
	captchaType?: CaptchaType.pow | CaptchaType.image | CaptchaType.puzzle;
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
