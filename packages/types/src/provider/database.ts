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
import type {
	ContextType,
	IIconOrderSettings,
	IPuzzleSettings,
} from "../client/settings.js";
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
	DecisionMachineKind,
	DecisionMachineLanguage,
	DecisionMachineRuntime,
	DecisionMachineScope,
} from "../decisionMachine/index.js";
import type {
	IconClick,
	IconOrderEvent,
	PuzzleEvent,
	RequestHeaders,
} from "./api.js";
import type { SimdReadings } from "./detection.js";
import {
	type MatchedAccessRule,
	MatchedAccessRuleSchema,
} from "./matchedAccessRule.js";
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
	// Normalised form of `email` used by the per-email submission-count check.
	// Kept as a separate persisted field so the count query can hit a single
	// indexed value instead of computing a normalisation server-side. Written
	// alongside `email` whenever `storeMetadata` is on.
	emailNormalised?: string;
}

// Widget-controlled metadata captured during the captcha solution submission.
// Always persisted when present (not gated by `storeMetadata`) — this is a
// signal channel for the honeypot (and any future widget-side traps).
export interface ClientMetaData {
	hp?: string;
	// The site-owner session id the widget was rendered with (`data-sessionid`
	// / `renderOptions.sessionId`). Named `clientSessionId` rather than
	// `sessionId` because the record already carries a top-level `sessionId`
	// for the provider's own frictionless session — these are different
	// things and both appear on the same document.
	clientSessionId?: string;
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
	// Set once on first transition; never overwritten.
	submittedAtTimestamp?: Date;
	verifiedAtTimestamp?: Date;
	failedAtTimestamp?: Date;
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
	// True when this record represents a blocked request rather than a
	// legitimate user failure of the challenge. Mirrors `Session.blocked`
	// so either collection can be queried with the same filter — see
	// `isBlockingCaptchaResult` for the classification rule (PoW: any
	// Disapproved is a block; image/puzzle: server-side rejection only,
	// not CAPTCHA_INVALID_SOLUTION). Written by the canonical result
	// writers in the DB layer alongside `result`.
	blocked?: boolean;
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
	emailNormalised: string().optional(),
}) satisfies ZodType<StoredCaptchaMetadata, ZodTypeDef, unknown>;

export const ClientMetaDataDbSchema = object({
	hp: string().optional(),
	clientSessionId: string().optional(),
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
	// The full ipinfo payload — optional and not validated nominally
	// because IPInfoResponse is a discriminated union and consumers
	// only need to narrow at read time. Mirrors PoWCaptchaStoredSchema.
	// Omitting these dropped enrichment on every commitment because Zod
	// strips unknown keys by default.
	ipInfo: any().optional(),
	parsedUserAgentInfo: any().optional(),
	storedAtTimestamp: date().optional(),
	requestedAtTimestamp: date(),
	submittedAtTimestamp: date().optional(),
	verifiedAtTimestamp: date().optional(),
	failedAtTimestamp: date().optional(),
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
	// True when this session was minted by the post-PoW routing machine
	// as an escalation of a prior session (see `buildEscalation` in
	// submitPoWCaptchaSolution). Absent / false on ordinary
	// frictionless-created sessions. Persisted so analytics can separate
	// "user hit the widget cold" from "user got escalated into a
	// stronger captcha after a low-confidence PoW".
	isEscalation: boolean().optional(),
	// SessionId of the session this one escalated from. Populated when
	// isEscalation is true; used by the DM-input read path to fall back
	// to the origin for fields the escalation doesn't carry itself
	// (simdReadings, dnsEvent, etc.). Absent on non-escalation sessions.
	originSessionId: string().optional(),
	decryptedHeadHash: string(),
	siteKey: string().optional(),
	// Full page URL the widget was rendered on (origin + path only — query
	// string, fragment and any embedded credentials are stripped client- and
	// server-side). Reported by the client in the frictionless payload; its
	// absence forces an image captcha. Optional so older sessions still parse.
	//
	// When the widget is embedded, `currentUrl` is the top-frame URL and
	// `iframeUrl` is the widget's own frame URL. `iframeUrl` is undefined
	// when the widget IS the top frame (nothing to distinguish).
	currentUrl: string().optional(),
	iframeUrl: string().optional(),
	// True when this session looks like a Protect deployment: the widget
	// iframe was served from `protect.<tenant>` and embedded in a page on
	// the same tenant (see isProtectDeployment in @prosopo/util for the
	// exact rule). Persisted only when true — matches the `isEscalation`
	// pattern so ordinary sessions stay slim and a sparse index carries
	// only the Protect subset.
	isProtect: boolean().optional(),
	// Selection reason: writes go through `FrictionlessReason`, but the
	// schema accepts any string at runtime so old records (or unforeseen
	// values) still parse. Output type is cast back to the enum so the
	// TS surface stays strict.
	reason: string()
		.optional()
		.transform((v) => v as FrictionlessReason | undefined),
	blocked: boolean().optional(),
	// See Session.ruleHash — populated on synthetic blocked-session records.
	ruleHash: string().optional(),
	ruleType: string().array().optional(),
	ruleDescription: string().optional(),
	// See Session.matchedRule.
	matchedRule: MatchedAccessRuleSchema.optional(),
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
	entropyMathRandomFingerprint: string().optional(),
	entropyCryptoFingerprint: string().optional(),
	entropyWallClockOffsetMs: number().optional(),
	entropyMathRandomFirst: number().optional(),
	g: string().optional(),
	i: boolean().optional(),
	// Raw iOS WKWebView-vs-Safari DOM signals that the client-side
	// classifier folds into `webView`. Persisted per session so
	// decision-machine rules can key off the individual signals
	// without a catcher release. Undefined on non-iOS / non-WebKit
	// clients and on catcher versions predating the fields.
	//   sw = navigator.serviceWorker present
	//   md = navigator.mediaDevices present
	//   bn = window.browser namespace present (WebExtensions)
	//   fs = document.fullscreenEnabled present
	sw: boolean().optional(),
	md: boolean().optional(),
	bn: boolean().optional(),
	fs: boolean().optional(),
	// Per-TLS-connection handshake timings forwarded by the chaddy Caddy
	// plugin (X-TLS-TCP-To-Chello-Us / X-TLS-Chello-To-Handshake-Us).
	// Server-observed microsecond deltas across the TLS handshake
	// lifecycle — elevated values indicate the client's ClientHello
	// traversed a proxy chain before reaching Caddy. Optional so
	// pre-migration sessions parse and dev requests that skip TLS still
	// write.
	tcpToChelloUs: number().optional(),
	chelloToHandshakeUs: number().optional(),
	// Raw per-connection TCP-handshake signals forwarded by chaddy from
	// its co-located tcp-probe eBPF sidecar. Wire-observed primitives
	// (RFC-793 / RFC-9293) — kernel nanosecond timestamps of SYN /
	// SYN-ACK / ACK, the SYN's TTL byte, and its TCP options. Deliberately
	// stored raw with no derived latency / hop-count / stack-hash fields
	// so consumers are free to compute any equivalent metric at query
	// time. Undefined on sessions that came in without the tcp-probe
	// pipeline (pre-rollout traffic, dev, or requests through a
	// non-chaddy front).
	synNs: number().optional(),
	synackNs: number().optional(),
	ackNs: number().optional(),
	observedTtl: number().min(0).max(255).optional(),
	tcpMss: number().min(0).max(65535).optional(),
	tcpWscale: number().min(0).max(255).optional(),
	tcpOptsFlags: number().min(0).max(255).optional(),
	tcpOptsOrder: number().min(0).max(4_294_967_295).optional(),
	tcpWindow: number().min(0).max(65535).optional(),
	dnsEvent: object({
		resolverIp: string().optional(),
		peerIp: string().optional(),
		pathValid: boolean().optional(),
		receivedAt: date(),
	}).optional(),
	// See Session.clientMetaData.
	clientMetaData: ClientMetaDataDbSchema.optional(),
}) satisfies ZodType<Session, ZodTypeDef, unknown>;

// Session now includes all frictionless token fields
export type Session = {
	sessionId: string;
	createdAt: Date;
	token: string;
	score: number;
	threshold: number;
	scoreComponents: ScoreComponents;
	ipAddress: CompositeIpAddress;
	captchaType: CaptchaType;
	mode?: ModeEnum;
	solvedImagesCount?: number;
	powDifficulty?: number;
	// Puzzle-only render overrides chosen by the routing machine, persisted
	// so getPuzzleCaptchaChallenge can layer them in. That endpoint otherwise
	// re-derives its overrides from a live trafficFilter verdict, which a
	// machine-chosen puzzle has no counterpart for. Same semantics as the
	// trafficFilter challenge-policy fields of the same names.
	puzzleTolerance?: number;
	puzzle?: IPuzzleSettings;
	// Icon-order equivalents of the two fields above, with identical
	// semantics: persisted by the routing machine so
	// getIconOrderCaptchaChallenge can layer them in.
	iconOrderTolerance?: number;
	iconOrder?: IIconOrderSettings;
	storedAtTimestamp?: Date;
	lastUpdatedTimestamp?: Date;
	// See StoredCaptcha.pendingStage — same semantics on Session records.
	pendingStage?: boolean;
	deleted?: boolean;
	userSitekeyIpHash?: string;
	webView: boolean;
	iFrame: boolean;
	// True when this session was minted by the post-PoW routing machine
	// as an escalation. Undefined / false on ordinary frictionless sessions.
	isEscalation?: boolean;
	// SessionId of the origin session this one escalated from. Populated
	// alongside isEscalation; consumed by the DM-input read path.
	originSessionId?: string;
	decryptedHeadHash: string;
	// The provider-assigned detector pool bundle this session's detector ran
	// from, promoted off the short-lived detectorSessionId→bundleId Redis
	// binding at frictionless-decrypt time. Later hops (PoW/puzzle solution
	// submit, SIMD attach) resolve the same bundle's keypair + inner cipher
	// from this durable field to decrypt the behavioural/SIMD payloads — the
	// detector lives only on providers, so there is no key pool to fall back to.
	bundleId?: string;
	siteKey?: string;
	// Full page URL the widget was rendered on (origin + path only — query
	// string, fragment and any embedded credentials are stripped client- and
	// server-side). Reported by the client in the frictionless payload; its
	// absence forces an image captcha.
	//
	// When the widget is embedded, `currentUrl` is the top-frame URL and
	// `iframeUrl` is the widget's own frame URL. `iframeUrl` is undefined
	// when the widget IS the top frame (nothing to distinguish).
	currentUrl?: string;
	iframeUrl?: string;
	// True when this session looks like a Protect deployment — widget
	// iframe served from `protect.<tenant>`, embedded in a page on the
	// same tenant. Undefined/absent on non-Protect sessions.
	isProtect?: boolean;
	reason?: FrictionlessReason;
	blocked?: boolean;
	// When `blocked` is true, these record which access-policy rule matched
	// at the request-time block middleware. Populated only on synthetic
	// "blocked session" records the inspector writes when it 401s a request,
	// so the Traffic page can surface "why are we blocking traffic for this
	// site?" without an extra Mongo lookup against the rules collection.
	ruleHash?: string; // == the redis-key suffix of the matched rule
	ruleType?: string[]; // populated scope fields, e.g. ['ja4Hash'], ['ja4Hash','coords']
	ruleDescription?: string; // operator-set description copied from the rule's AccessPolicy
	// The full matched rule, denormalised at enforcement time. Unlike the three
	// fields above it is written by EVERY access-policy path — the request-time
	// block middleware, the frictionless entry (block and restrict alike), and
	// the verify-time hard-block check — so the audit page can name the exact
	// policy that acted on a request rather than just echoing its description.
	// See MatchedAccessRule for why the rule is copied rather than joined.
	matchedRule?: MatchedAccessRule;
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
	entropyMathRandomFingerprint?: string;
	entropyCryptoFingerprint?: string;
	entropyWallClockOffsetMs?: number;
	entropyMathRandomFirst?: number;
	g?: string;
	i?: boolean;
	// Raw iOS WKWebView-vs-Safari DOM signals — see SessionSchema above.
	sw?: boolean;
	md?: boolean;
	bn?: boolean;
	fs?: boolean;
	// Per-TLS-connection handshake timings forwarded by the chaddy Caddy
	// plugin. See the SessionSchema block above for full semantics —
	// elevated values indicate the client's ClientHello traversed a
	// proxy chain before reaching Caddy.
	tcpToChelloUs?: number;
	chelloToHandshakeUs?: number;
	// Raw per-connection TCP-handshake signals — see SessionSchema block
	// above. Wire primitives from the tcp-probe eBPF sidecar; consumers
	// derive whatever timing / hop / stack fingerprints they want at
	// query time from these fields.
	synNs?: number;
	synackNs?: number;
	ackNs?: number;
	observedTtl?: number;
	tcpMss?: number;
	tcpWscale?: number;
	tcpOptsFlags?: number;
	tcpOptsOrder?: number;
	tcpWindow?: number;
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
	// Site-owner-supplied metadata the widget was rendered with, mirrored up
	// from the captcha record so the session row carries it too. Today that is
	// just `clientSessionId` (Protect's JTI or any per-user session id the site
	// holds); it is an object rather than a flat field because more render-time
	// metadata is expected to land here. The verify endpoints correlate the
	// `clientSessionId` the dapp server sends against the one recorded here /
	// on the captcha record, and reject the token when they disagree.
	clientMetaData?: ClientMetaData;
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
	submittedAtTimestamp: date().optional(),
	verifiedAtTimestamp: date().optional(),
	failedAtTimestamp: date().optional(),
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

/**
 * The icon-order answer, at rest.
 *
 * `targets` is the whole secret: the ordered icon placements the user has to
 * click. It is written here at challenge time and read back at submit time,
 * and it is the reason the challenge response can be pure imagery — nothing
 * in this record is ever serialised to a client. Decoy placements are
 * deliberately NOT stored: they are already expressed in the pixels and
 * grading never consults them.
 */
export interface IconOrderCaptchaStored extends StoredCaptcha {
	challenge: PoWChallengeId;
	targets: StoredIconTarget[];
	/** Hit radius as a multiple of each icon's own size. */
	tolerance: number;
	providerSignature: string;
	userSignature?: string;
	userAccount: string;
	dappAccount: string;
	clicks?: IconClick[];
	iconOrderEvents?: IconOrderEvent[];
}

/**
 * One target icon as persisted. Mirrors `IconPlacement` from
 * `@prosopo/icon-order-assets` minus the fields that only matter to the
 * renderer (rotation, hue): grading needs the centre and the size, and
 * storing the rest would put more of the frame's construction in the
 * database than the grader has any use for.
 */
export interface StoredIconTarget {
	x: number;
	y: number;
	size: number;
	kind: string;
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
	kind?: DecisionMachineKind;
	runtime: DecisionMachineRuntime;
	language?: DecisionMachineLanguage;
	source: string;
	name?: string;
	version?: string;
	captchaType?:
		| CaptchaType.pow
		| CaptchaType.image
		| CaptchaType.puzzle
		| CaptchaType.iconOrder;
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
