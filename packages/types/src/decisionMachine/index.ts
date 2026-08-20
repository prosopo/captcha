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
import type { IPInfoResponse } from "../api/ipapi.js";
import {
	CaptchaType,
	DecisionMachineCaptchaTypeSchema,
} from "../client/captchaType/captchaType.js";
import type { PuzzleEvent, RequestHeaders } from "../provider/api.js";
import type { ScoreComponents } from "../provider/database.js";
import type { SimdReadings } from "../provider/detection.js";
import type { FrictionlessReason } from "../provider/reasons.js";

export type EnrichedDnsEvent = {
	peerIp?: string;
	resolverIp?: string;
	pathValid?: boolean;
	peerIpInfo?: IPInfoResponse;
	resolverIpInfo?: IPInfoResponse;
};

export enum DecisionMachineRuntime {
	Node = "node",
}

export enum DecisionMachineKind {
	Routing = "routing",
	Decision = "decision",
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
	// Full ipinfo payload. `countryCode` is kept as a separate top-level
	// field for backwards compatibility with existing decision machines, but
	// rules that need isDatacenter / isVPN / asnNumber / isAbuser etc. should
	// read from `ipInfo` (set to the same payload stored on the captcha
	// challenge record). Undefined for invalid lookups.
	ipInfo?: IPInfoResponse;
	dnsEvent?: EnrichedDnsEvent;
	// Session-derived fields forwarded from the Session record loaded at
	// the verify path. Undefined when no frictionless session preceded.
	score?: number;
	threshold?: number;
	scoreComponents?: ScoreComponents;
	decryptedHeadHash?: string;
	userSitekeyIpHash?: string;
	simdReadings?: SimdReadings;
	frictionlessReason?: FrictionlessReason;
	ruleType?: string[];
	webView?: boolean;
	iFrame?: boolean;
	// Checkbox click + shape clicks embedded in the solution salt. For pow
	// and puzzle this is `[[[checkboxX, checkboxY]]]` (single click); for
	// image the outer array has one entry per tile with the first tile's
	// inner array prefixed by the checkbox click. Missing when the client
	// omitted the salt, produced an invalid one, or the record pre-dates
	// coord capture.
	coords?: [number, number][][];
	// Puzzle-only: per-event trail of the drag from origin to target,
	// captured client-side and persisted on the puzzle captcha record.
	// Always undefined on pow / image inputs.
	puzzleEvents?: PuzzleEvent[];
	// Raw per-connection TCP-handshake signals forwarded by chaddy from
	// its co-located tcp-probe eBPF sidecar (see @prosopo/provider
	// rawTlsSignalsMiddleware). Persisted on the frictionless Session
	// record and surfaced here at verify time. Undefined on sessions
	// captured before tcp-probe deploy or served through an ingress
	// without the sidecar.
	synNs?: number;
	synackNs?: number;
	ackNs?: number;
	observedTtl?: number;
	tcpMss?: number;
	tcpWscale?: number;
	tcpOptsFlags?: number;
	tcpOptsOrder?: number;
	tcpWindow?: number;
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

export const COUNTER_DIMENSIONS = ["ip", "userAccount", "peerIp"] as const;
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
	fingerprintProof?: string;
	// Decoded per-CPU WASM SIMD fingerprint readings, when the client submitted
	// them with the PoW solution (decrypted and attached to the session, then
	// surfaced here for the post-pow routing machine). Undefined when absent or
	// unsupported on the client.
	simd?: SimdReadings;
	// Server-observed TLS handshake timing deltas forwarded by the chaddy
	// Caddy plugin (X-TLS-TCP-To-Chello-Us / X-TLS-Chello-To-Handshake-Us).
	// Elevated values indicate the client's ClientHello traversed a proxy
	// chain before reaching Caddy. Undefined when the request did not
	// traverse a chaddy-enabled ingress (e.g. dev requests, HTTP/3).
	tcpToChelloUs?: number;
	chelloToHandshakeUs?: number;
	// Raw per-connection TCP-handshake signals forwarded by chaddy from
	// its co-located tcp-probe eBPF sidecar. Wire-observed primitives
	// (RFC-793 / RFC-9293) captured off the WAN NIC before caddy sees the
	// TLS bytes. All optional — a request that came in through an ingress
	// without a running tcp-probe pipeline has all fields undefined.
	//
	// Fields decoded from the sidecar's `X-TLS-*` headers by
	// `rawTlsSignalsMiddleware`. See @prosopo/types Session for full
	// per-field semantics (kernel monotonic ns for the syn/synack/ack
	// timestamps, TTL byte for observedTtl, MSS / window-scale / options
	// bitfield / packed options order / window from the client's SYN).
	synNs?: number;
	synackNs?: number;
	ackNs?: number;
	observedTtl?: number;
	tcpMss?: number;
	tcpWscale?: number;
	tcpOptsFlags?: number;
	tcpOptsOrder?: number;
	tcpWindow?: number;
	// IP metadata as looked up by `ipInfoMiddleware` from the provider's
	// ipapi/isp mirror at request time. Undefined when the lookup failed
	// or the middleware wasn't reached (dev requests bypassing the
	// standard chain). Undefined-check any field before use — an IPInfo
	// with `isValid:false` means the lookup errored and no threat
	// indicators are populated.
	//
	// Route-time surfacing of `ipInfo` complements the existing
	// decide-kind `input.ipInfo`: decide loads the persisted ipapi
	// payload from the Session record at verify time, route now carries
	// the live per-request lookup so a routing machine can reason on
	// asn / isProxy / isMobile / isDatacenter at the frictionless entry
	// (e.g. escalate iPhone-UA + isProxy:true to puzzle).
	ipInfo?: IPInfoResponse;
	// Full page URL the widget was rendered on (origin + path only; query
	// string, fragment and any embedded credentials are stripped client- and
	// server-side). Available on the `route` phase from the freshly decrypted
	// frictionless payload, and on the `postPow` phase from the persisted
	// Session record. Undefined when the client omitted it or the session
	// pre-dates the field.
	//
	// When the widget is embedded, `currentUrl` is the top-frame URL and
	// `iframeUrl` is the widget's own frame URL. `iframeUrl` is undefined
	// when the widget IS the top frame (nothing to distinguish) or when the
	// client / persisted session pre-dates the field.
	currentUrl?: string;
	iframeUrl?: string;
}

export type RoutingMachinePhase = "route" | "postPow";

export interface RoutingMachineInputBase {
	phase: RoutingMachinePhase;
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
	// Optional selection reason the machine can attach to explain an escalation
	// (e.g. why it chose image over pow). Persisted to `session.reason` by the
	// provider. Free-form string because machines are operator-authored.
	reason?: string;
}

export const RoutingMachineOutputSchema = z.object({
	captchaType: z.union([
		z.literal(CaptchaType.pow),
		z.literal(CaptchaType.image),
		z.literal(CaptchaType.puzzle),
	]),
	solvedImagesCount: z.number().int().positive().optional(),
	powDifficulty: z.number().positive().optional(),
	reason: z.string().optional(),
});
