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

import { severityToPuzzleDifficulty } from "@prosopo/captcha-severity";
import type { Logger } from "@prosopo/logger";
import { DEFAULT_RENDER_SETTINGS } from "@prosopo/puzzle-assets";
import {
	ApiParams,
	CaptchaType,
	type CompositeIpAddress,
	FrictionlessReason,
	type GetFrictionlessCaptchaResponse,
	type IPInfoResponse,
	type ImageRoundsBounds,
	type KeyringPair,
	type ModeEnum,
	NO_MEASUREMENT_REASONS,
	type ProsopoConfigOutput,
	type RequestHeaders,
	type RoutingMachineBaseline,
	type RoutingMachineOutput,
	type ScoreComponents,
	type Session,
	SimdReadingsStage,
	clampImageRounds,
	puzzleMaxDifficultyDefault,
} from "@prosopo/types";
import type { IProviderDatabase } from "@prosopo/types-database";
import type { AccessPolicy } from "@prosopo/user-access-policy";
import { v4 as uuidv4 } from "uuid";
import { buildDnsEventUrl } from "../../api/dnsEventUrl.js";
import type { RawTlsSignals } from "../../api/rawTlsSignalsMiddleware.js";
import { checkLangRules } from "../../rules/lang.js";
import {
	type UsageCounters,
	buildAllWindowIncrements,
} from "../../util/usageCounters.js";
import { isClientSessionMismatch } from "../../utils/clientMetaData.js";
import { CaptchaManager } from "../captchaManager.js";
import { coerceToEnabledCaptchaType } from "../captchaTypeSelection.js";
import { DecisionMachineRunner } from "../decisionMachine/decisionMachineRunner.js";
import { getBotScore } from "../detection/getBotScore.js";
import { samplePuzzleDifficulty } from "../puzzle/puzzleDifficulty.js";
import { ipMatchesSession } from "./ipMatch.js";
import { type RoutingContext, applyRouter } from "./routingMachine.js";

const DEFAULT_MAX_TIMESTAMP_AGE = 60 * 10 * 1000; // 10 minutes

const getSessionIDPrefix = (host?: string): string => {
	return host ? host.replace(".prosopo.io", "") : "local";
};

// FrictionlessReason now lives in @prosopo/types so non-server packages
// (audit portal, tests) can reference it without depending on the provider.
export { FrictionlessReason };

export interface ImageCaptchaSessionParams extends Session {}

export interface PowCaptchaSessionParams extends Session {}

export interface PuzzleCaptchaSessionParams extends Session {}

export class FrictionlessManager extends CaptchaManager {
	private sessionParams?: Omit<
		Session,
		"sessionId" | "createdAt" | "captchaType"
	>;
	private routingContext?: RoutingContext;
	private readonly decisionMachineRunner: DecisionMachineRunner;
	private readonly usageCounters: UsageCounters | null;

	constructor(
		db: IProviderDatabase,
		pair: KeyringPair,
		config: ProsopoConfigOutput,
		logger?: Logger,
		writeQueue?: import("@prosopo/database").RedisWriteQueue | null,
		decisionMachineRunner?: DecisionMachineRunner,
		usageCounters?: UsageCounters | null,
	) {
		super(db, pair, config, logger, writeQueue);
		this.config = config;
		this.decisionMachineRunner =
			decisionMachineRunner ?? new DecisionMachineRunner(db);
		this.usageCounters = usageCounters ?? null;
	}

	/**
	 * Provide the routing-machine context for this request. When set, the
	 * frictionless flow's send*Captcha calls will (a) invoke the routing
	 * machine to potentially override the baseline captcha type, and (b) emit
	 * fire-and-forget served-counter writes after the session is created.
	 *
	 * Not called on maintenance-mode or configured-captchaType short-circuit
	 * paths — those skip routing entirely.
	 */
	setRoutingContext(ctx: RoutingContext): void {
		this.routingContext = ctx;
	}

	/**
	 * Evaluate the configured routing machine against an arbitrary baseline +
	 * context, without going through `sendCaptcha`. Used by the dedup
	 * short-circuit to ask "if we reused this cached session, would the
	 * current routing machine still pick the same captchaType?" — if not,
	 * the cached session is evicted and the request falls through into the
	 * normal decision-machine flow (which will run the router again with
	 * fully-derived inputs).
	 *
	 * Returns the supplied baseline on any failure (no machine, machine
	 * throws, counter fetch failure, etc.), matching applyRouter's contract.
	 */
	async applyRoutingMachine(
		baseline: RoutingMachineBaseline,
		ctx: RoutingContext,
	): Promise<RoutingMachineOutput> {
		return applyRouter(
			this.decisionMachineRunner,
			this.usageCounters,
			baseline,
			ctx,
			this.logger,
		);
	}

	setSessionParams(
		params: Omit<Session, "sessionId" | "createdAt" | "captchaType">,
	): void {
		this.sessionParams = {
			token: params.token,
			score: params.score,
			threshold: params.threshold,
			scoreComponents: params.scoreComponents,
			ipAddress: params.ipAddress,
			webView: params.webView ?? false,
			iFrame: params.iFrame ?? false,
			decryptedHeadHash: params.decryptedHeadHash,
			bundleId: params.bundleId,
			siteKey: params.siteKey,
			currentUrl: params.currentUrl,
			iframeUrl: params.iframeUrl,
			isProtect: params.isProtect,
			ipInfo: params.ipInfo,
			headers: params.headers,
			mode: params.mode,
			simdReadings: params.simdReadings,
			entropyMathRandomFingerprint: params.entropyMathRandomFingerprint,
			entropyCryptoFingerprint: params.entropyCryptoFingerprint,
			entropyWallClockOffsetMs: params.entropyWallClockOffsetMs,
			sw: params.sw,
			md: params.md,
			bn: params.bn,
			fs: params.fs,
			entropyMathRandomFirst: params.entropyMathRandomFirst,
			g: params.g,
			i: params.i,
			cv: params.cv,
			sq: params.sq,
			b: params.b,
			tcpToChelloUs: params.tcpToChelloUs,
			chelloToHandshakeUs: params.chelloToHandshakeUs,
			// Raw per-connection TCP-handshake signals forwarded by chaddy
			// from its co-located tcp-probe eBPF sidecar. Passed through as
			// a bag on createSession() below rather than expanded into 9
			// positional args.
			synNs: params.synNs,
			synackNs: params.synackNs,
			ackNs: params.ackNs,
			observedTtl: params.observedTtl,
			tcpMss: params.tcpMss,
			tcpWscale: params.tcpWscale,
			tcpOptsFlags: params.tcpOptsFlags,
			tcpOptsOrder: params.tcpOptsOrder,
			tcpWindow: params.tcpWindow,
		};
	}

	/**
	 * Record the access rule that matched this request, so every session this
	 * request goes on to write carries it.
	 *
	 * Set separately from `setSessionParams` (which runs before rules are
	 * evaluated) and applied at `createSession` time, so it reaches all the
	 * outcomes a matched rule can lead to: the 401'd block, the auto-ban a
	 * score bump triggered, the captcha type a Restrict rule forced, and the
	 * ordinary decision-machine session a score-only Restrict leaves behind.
	 * Mirrors `updateScore`'s after-the-fact mutation of the same bag.
	 */
	setMatchedRule(matchedRule: Session["matchedRule"]): void {
		if (this.sessionParams) {
			this.sessionParams.matchedRule = matchedRule;
		}
	}

	updateScore(score: number, scoreComponents: ScoreComponents): void {
		if (this.sessionParams) {
			this.sessionParams.score = score;
			this.sessionParams.scoreComponents = scoreComponents;
		}
	}

	checkLangRules(acceptLanguage: string): number {
		return checkLangRules(this.config, acceptLanguage);
	}

	async createSession(
		token: string,
		score: number,
		threshold: number,
		scoreComponents: ScoreComponents,
		ipAddress: CompositeIpAddress,
		captchaType: CaptchaType,
		siteKey: string,
		solvedImagesCount?: number,
		powDifficulty?: number,
		userSitekeyIpHash?: string,
		webView = false,
		iFrame = false,
		decryptedHeadHash = "",
		reason?: FrictionlessReason,
		blocked?: boolean,
		deleted?: boolean,
		ipInfo?: IPInfoResponse,
		headers?: RequestHeaders,
		mode?: ModeEnum,
		simdReadings?: Session["simdReadings"],
		entropyMathRandomFingerprint?: Session["entropyMathRandomFingerprint"],
		entropyCryptoFingerprint?: Session["entropyCryptoFingerprint"],
		entropyWallClockOffsetMs?: Session["entropyWallClockOffsetMs"],
		entropyMathRandomFirst?: Session["entropyMathRandomFirst"],
		bundleId?: Session["bundleId"],
		currentUrl?: Session["currentUrl"],
		tcpToChelloUs?: Session["tcpToChelloUs"],
		chelloToHandshakeUs?: Session["chelloToHandshakeUs"],
		isEscalation?: Session["isEscalation"],
		iframeUrl?: Session["iframeUrl"],
		isProtect?: Session["isProtect"],
		originSessionId?: Session["originSessionId"],
		g?: Session["g"],
		matchedRule?: Session["matchedRule"],
		i?: Session["i"],
		sw?: Session["sw"],
		md?: Session["md"],
		bn?: Session["bn"],
		fs?: Session["fs"],
		// Bag of raw per-connection TCP-handshake signals (chaddy → tcp-probe
		// → provider). Kept as a bag rather than expanded into 9 positional
		// params to avoid pushing createSession's arity past 40.
		rawTlsSignals?: Partial<RawTlsSignals>,
		// Puzzle render overrides the routing machine asked for. Same bag
		// rationale as rawTlsSignals above.
		puzzleOverrides?: Pick<Session, "puzzleTolerance" | "puzzle">,
	): Promise<Session> {
		const sessionRecord: Session = {
			sessionId: `${getSessionIDPrefix(this.config.host)}-${uuidv4()}`,
			createdAt: new Date(),
			token,
			score,
			threshold,
			scoreComponents,
			ipAddress,
			captchaType,
			mode,
			solvedImagesCount,
			powDifficulty,
			// Only persisted for puzzle sessions — see the caller, which
			// nulls these out for other captcha types.
			...(puzzleOverrides?.puzzleTolerance !== undefined && {
				puzzleTolerance: puzzleOverrides.puzzleTolerance,
			}),
			...(puzzleOverrides?.puzzle && { puzzle: puzzleOverrides.puzzle }),
			userSitekeyIpHash,
			webView,
			iFrame,
			// Only persist the escalation flag when it's actually true —
			// avoids polluting analytics with `false` on every plain
			// frictionless session.
			...(isEscalation && { isEscalation: true }),
			// Origin sessionId is only meaningful for escalations. Persist
			// alongside isEscalation so the DM-input read path can walk
			// back for fallback fields (simdReadings, dnsEvent, etc.).
			...(originSessionId && { originSessionId }),
			decryptedHeadHash,
			bundleId,
			reason,
			siteKey,
			currentUrl,
			iframeUrl,
			// Same rationale as isEscalation above: only persist the flag
			// when it's actually true so non-Protect sessions stay slim and
			// the sparse index on {isProtect, createdAt} carries only the
			// Protect subset.
			...(isProtect && { isProtect: true }),
			blocked,
			deleted,
			ipInfo,
			headers,
			simdReadings,
			// Tag the arrival stage when the readings actually came in on
			// this hop. Absence of readings → absence of stage.
			...(simdReadings && {
				simdReadingsStage: SimdReadingsStage.frictionless,
			}),
			entropyMathRandomFingerprint,
			entropyCryptoFingerprint,
			entropyWallClockOffsetMs,
			entropyMathRandomFirst,
			g,
			i,
			sw,
			md,
			bn,
			fs,
			tcpToChelloUs,
			chelloToHandshakeUs,
			...(rawTlsSignals ?? {}),
			// Only present when an access policy actually matched this
			// request, so ordinary sessions stay slim.
			...(matchedRule && { matchedRule }),
		};

		await this.db.storeSessionRecord(sessionRecord);

		// Cache the session in Redis for fast lookups.
		// This reduces MongoDB reads for subsequent requests that need
		// to look up the session by sessionId or userSitekeyIpHash.
		//
		// Awaited (not fire-and-forget): the next request from this client
		// (e.g. /captcha/{type}) consumes the session and `await`s its
		// Redis invalidation. If the cache write here landed *after* that
		// invalidation, the stale entry would survive — Redis would keep
		// resolving the hash → sessionId mapping to a Mongo-deleted row
		// for the rest of the TTL, breaking subsequent captcha attempts
		// for the same user+IP+sitekey.
		if (this.writeQueue) {
			const cacheData = sessionRecord as unknown as Record<string, unknown>;
			const cachePromises: Promise<boolean>[] = [
				this.writeQueue.cacheSession(sessionRecord.sessionId, cacheData),
			];
			if (userSitekeyIpHash) {
				cachePromises.push(
					this.writeQueue.cacheSessionByHash(
						userSitekeyIpHash,
						sessionRecord.sessionId,
					),
				);
			}
			await Promise.all(cachePromises).catch(() => {});
		}

		return sessionRecord;
	}

	/**
	 * Dedicated issuance path for Web Bot Auth verified requests. The signature
	 * verification already carried the trust decision; there is no captcha to
	 * solve, no bot score to compute, no routing to run. The session is minted
	 * with `captchaType: authenticated`, `agent: true`, `webBotAuthAgent` set to
	 * the verified Signature-Agent URL, and `ipAddress` frozen for the verify-
	 * time IP-binding check. Consumed only by `/client/authenticated/verify`.
	 */
	async createAuthenticatedSession(
		token: string,
		ipAddress: CompositeIpAddress,
		webBotAuthAgent: string,
		siteKey: string,
		userSitekeyIpHash?: string,
		headers?: RequestHeaders,
		ipInfo?: IPInfoResponse,
		clientSessionId?: string,
	): Promise<Session> {
		const sessionRecord: Session = {
			sessionId: `${getSessionIDPrefix(this.config.host)}-${uuidv4()}`,
			createdAt: new Date(),
			token,
			// score / threshold are meaningless for a pre-verified pass; zero
			// them so downstream analytics never mistake the session for a
			// scored one.
			score: 0,
			threshold: 0,
			scoreComponents: { baseScore: 0 },
			ipAddress,
			captchaType: CaptchaType.authenticated,
			userSitekeyIpHash,
			webView: false,
			iFrame: false,
			decryptedHeadHash: "",
			siteKey,
			// Written rather than left absent: `verifyAuthenticatedSession`
			// reads this to enforce single use, and "field never set" and
			// "consumed" would otherwise be told apart only by an absence.
			serverChecked: false,
			agent: true,
			webBotAuthAgent,
			...(ipInfo && { ipInfo }),
			...(headers && { headers }),
			// Same shape as pow/image/puzzle: the render-time session id lives
			// on `clientMetaData.clientSessionId` so the verify-side comparison
			// is a straight equality check on the identical field regardless of
			// captcha type. Absent when the client didn't supply one, in which
			// case the verify check is a no-op (matches pow/image/puzzle).
			...(clientSessionId && { clientMetaData: { clientSessionId } }),
		};

		await this.db.storeSessionRecord(sessionRecord);

		if (this.writeQueue) {
			const cacheData = sessionRecord as unknown as Record<string, unknown>;
			const cachePromises: Promise<boolean>[] = [
				this.writeQueue.cacheSession(sessionRecord.sessionId, cacheData),
			];
			if (userSitekeyIpHash) {
				cachePromises.push(
					this.writeQueue.cacheSessionByHash(
						userSitekeyIpHash,
						sessionRecord.sessionId,
					),
				);
			}
			await Promise.all(cachePromises).catch(() => {});
		}

		return sessionRecord;
	}

	/**
	 * Verify an authenticated (Web Bot Auth) session. Called from
	 * `/client/authenticated/verify` after the operator forwards their
	 * dApp-signed token. Enforces the four properties that make replay
	 * infeasible:
	 *   1. session exists and was minted with captchaType=authenticated
	 *      (so ordinary captcha tokens can't be redeemed here)
	 *   2. session hasn't been consumed (serverChecked === false)
	 *   3. operator forwarded the client IP (`ip` is required — silently
	 *      dropping the check would nullify the whole binding)
	 *   4. the forwarded IP matches the IP the session was issued to
	 *
	 * Marks serverChecked=true on success so subsequent verifies fail loudly.
	 */
	async verifyAuthenticatedSession(
		sessionId: string,
		ip: string | undefined,
		clientSessionId: string | undefined,
	): Promise<{ verified: boolean; status: string }> {
		if (!ip) {
			return {
				verified: false,
				status: "API.AUTHENTICATED_IP_REQUIRED",
			};
		}
		const session = await this.db.getSessionRecordBySessionId(sessionId);
		if (!session) {
			return {
				verified: false,
				status: "API.USER_NOT_VERIFIED_NO_SOLUTION",
			};
		}
		if (session.captchaType !== CaptchaType.authenticated) {
			return {
				verified: false,
				status: "API.INCORRECT_CAPTCHA_TYPE",
			};
		}
		if (session.serverChecked) {
			return {
				verified: false,
				status: "API.USER_ALREADY_VERIFIED",
			};
		}
		if (!ipMatchesSession(ip, session.ipAddress)) {
			return {
				verified: false,
				status: "API.AUTHENTICATED_IP_MISMATCH",
			};
		}
		// Same semantics as pow/image/puzzle: `expected` is the id the dapp
		// server just supplied on the verify call, `recorded` is the id the
		// session was minted with. A site that doesn't opt in to correlation
		// (no `expected`) is a no-op; anything else — including "expected set
		// but nothing recorded" — is a mismatch. Uses the shared helper so the
		// authenticated flow can't drift from the other captcha types.
		if (
			isClientSessionMismatch(
				clientSessionId,
				session.clientMetaData?.clientSessionId,
			)
		) {
			return {
				verified: false,
				status: "API.CLIENT_SESSION_MISMATCH",
			};
		}
		await this.db.updateSessionRecord(sessionId, { serverChecked: true });
		return { verified: true, status: "API.USER_VERIFIED" };
	}

	async sendImageCaptcha(
		params?: Partial<ImageCaptchaSessionParams>,
	): Promise<GetFrictionlessCaptchaResponse> {
		return this.sendCaptcha(CaptchaType.image, params);
	}

	async sendPowCaptcha(
		params?: Partial<PowCaptchaSessionParams>,
	): Promise<GetFrictionlessCaptchaResponse> {
		return this.sendCaptcha(CaptchaType.pow, params);
	}

	async sendPuzzleCaptcha(
		params?: Partial<PuzzleCaptchaSessionParams>,
	): Promise<GetFrictionlessCaptchaResponse> {
		return this.sendCaptcha(CaptchaType.puzzle, params);
	}

	// Shared body for the three concrete `send*Captcha` helpers. Each helper is
	// kept as its own thin wrapper so call-sites read clearly, but session
	// validation and the createSession invocation only live in one place.
	private async sendCaptcha(
		captchaType: CaptchaType.image | CaptchaType.pow | CaptchaType.puzzle,
		params?: Partial<Session>,
	): Promise<GetFrictionlessCaptchaResponse> {
		const effectiveParams = { ...this.sessionParams, ...params };
		if (
			!effectiveParams.token ||
			effectiveParams.score === undefined ||
			effectiveParams.threshold === undefined ||
			!effectiveParams.scoreComponents ||
			!effectiveParams.ipAddress ||
			effectiveParams.siteKey === undefined
		) {
			throw new Error(
				`Session parameters must be set before sending a ${captchaType} captcha`,
			);
		}

		// Apply the routing machine (if any) to potentially override the
		// baseline captcha type. Only runs when the handler has supplied a
		// routing context; maintenance-mode and configured-captchaType
		// short-circuits skip routing entirely.
		const baseline: RoutingMachineBaseline = {
			captchaType,
			solvedImagesCount:
				captchaType === CaptchaType.image
					? effectiveParams.solvedImagesCount
					: undefined,
			powDifficulty:
				captchaType === CaptchaType.pow
					? effectiveParams.powDifficulty
					: undefined,
		};
		const routed: RoutingMachineOutput = this.routingContext
			? await applyRouter(
					this.decisionMachineRunner,
					this.usageCounters,
					baseline,
					this.routingContext,
					this.logger,
				)
			: baseline;

		// Resolve the routed type against what the site permits and what this
		// provider can render, before the session is written, so every later
		// hop sees a consistent type. A session minted as a type we cannot
		// fulfil strands the user on INCORRECT_CAPTCHA_TYPE — /captcha/puzzle
		// answers with GetPuzzleCaptchaResponse and nothing else, so it cannot
		// substitute another type at serve time.
		//
		// This sits after the router deliberately: it is the last word on
		// captchaType, so it constrains the score ladder, the access-policy
		// and traffic-filter paths, and the routing machine alike.
		const finalCaptchaType = coerceToEnabledCaptchaType(
			routed.captchaType,
			this.routingContext?.frictionlessTypes,
			this.logger,
		);
		// Every other path that sizes an image challenge clamps to the
		// sitekey's `[imageMinRounds, imageMaxRounds]`; a router-supplied count
		// was the one that didn't, and the routing-machine output schema only
		// bounds it as a positive int. Clamp here so a router cannot hand a
		// user more or fewer rounds than the site configured. The
		// `effectiveParams` fallback is already clamped by its caller, so this
		// only bites on `routed`.
		const requestedSolvedImagesCount =
			routed.solvedImagesCount ?? effectiveParams.solvedImagesCount;
		// The bounds are always supplied by the only `setRoutingContext`
		// caller. Fall back to the schema defaults rather than skipping the
		// clamp if they ever go missing: an unbounded round count is a worse
		// failure than a conservative one, and the previous conditional
		// silently served whatever the router asked for when the ceiling was
		// absent. `RoutingContext` carries both bounds as its own fields, so it
		// satisfies `ImageRoundsBounds` directly.
		const imageRoundsBounds: ImageRoundsBounds = this.routingContext ?? {};
		const finalSolvedImagesCount =
			finalCaptchaType === CaptchaType.image
				? requestedSolvedImagesCount !== undefined
					? clampImageRounds(requestedSolvedImagesCount, imageRoundsBounds)
					: requestedSolvedImagesCount
				: undefined;
		const finalPowDifficulty =
			finalCaptchaType === CaptchaType.pow
				? (routed.powDifficulty ?? effectiveParams.powDifficulty)
				: undefined;
		// A router that overrode the captcha type is the more specific
		// explanation of what was served, so its reason wins over the one the
		// score ladder left on the session params. Mirrors the postPow path,
		// which already does `routed.reason ?? originSession.reason`. Without
		// this a route-phase selection reason never reached the session and
		// was invisible in the portal.
		//
		// Resolved here rather than beside its use on the session record below,
		// because the puzzle overrides need it to tell an escalation from a
		// missing measurement.
		const finalReason =
			(routed.reason as FrictionlessReason | undefined) ??
			(effectiveParams.reason as FrictionlessReason | undefined);
		// Puzzle tunables persisted on the session so getPuzzleCaptchaChallenge
		// can layer them over the site defaults — that endpoint re-derives its
		// overrides from a live trafficFilter verdict, and a router- or
		// severity-chosen puzzle has no verdict to re-derive from. Dropped
		// unless the resolved type actually is a puzzle, so a coerced session
		// never carries stale render settings.
		//
		// Two sources, in precedence order:
		//
		//   1. The difficulty ladder, derived from the round count the caller
		//      asked for. A puzzle has no rounds, so without this every
		//      escalation on an image-disabled site would collapse into an
		//      identical challenge and the graduated response would be lost.
		//   2. Explicit router overrides, which win — an operator naming a
		//      tolerance means it, and should not be second-guessed by a
		//      severity heuristic.
		const finalPuzzleOverrides: Pick<Session, "puzzleTolerance" | "puzzle"> =
			finalCaptchaType === CaptchaType.puzzle
				? (() => {
						// Paths that measured nothing carry a fixed fallback round
						// count, not a severity — see NO_MEASUREMENT_REASONS. Reading
						// one as an escalation silently replaces the site's puzzle
						// config with ladder values for every user of a site whose
						// detector cannot run at all (CSP blocking the bundle, say),
						// which is the opposite of what an operator configuring an
						// easier puzzle asked for.
						// The site's own ceiling on automatic escalation. 0 pins it to
						// level 0, so its configured puzzle settings render every
						// time — the puzzle counterpart to `imageMaxRounds` holding
						// every round-count source to the site's bound.
						const maxLevel =
							this.routingContext?.puzzleMaxDifficulty ??
							puzzleMaxDifficultyDefault;
						const level =
							finalReason !== undefined &&
							NO_MEASUREMENT_REASONS.has(finalReason)
								? 0
								: severityToPuzzleDifficulty(
										requestedSolvedImagesCount,
										this.routingContext?.baseImageRounds ??
											this.config.captchas.solved.count,
										maxLevel,
									);
						// Level 0 means "nothing escalated this session". Sampling a
						// band here would override the site's own configured
						// puzzleTolerance / puzzle settings with ladder values, which
						// is a silent config change, not an escalation. Leave the
						// session bare so getPuzzleCaptchaChallenge falls back to the
						// site defaults exactly as it did before the ladder existed.
						const difficulty =
							level > 0
								? samplePuzzleDifficulty(
										level,
										DEFAULT_RENDER_SETTINGS.holeDarken,
									)
								: undefined;
						const tolerance = routed.puzzleTolerance ?? difficulty?.tolerance;
						const puzzle =
							routed.puzzle || difficulty
								? { ...(difficulty?.puzzle ?? {}), ...(routed.puzzle ?? {}) }
								: undefined;
						return {
							...(tolerance !== undefined && { puzzleTolerance: tolerance }),
							...(puzzle !== undefined && { puzzle }),
						};
					})()
				: {};
		const blocked =
			finalCaptchaType === CaptchaType.image
				? effectiveParams.blocked
				: undefined;

		const sessionRecord = await this.createSession(
			effectiveParams.token,
			effectiveParams.score,
			effectiveParams.threshold,
			effectiveParams.scoreComponents,
			effectiveParams.ipAddress,
			finalCaptchaType,
			effectiveParams.siteKey,
			finalSolvedImagesCount,
			finalPowDifficulty,
			effectiveParams.userSitekeyIpHash,
			effectiveParams.webView ?? false,
			effectiveParams.iFrame ?? false,
			effectiveParams.decryptedHeadHash,
			finalReason,
			blocked,
			undefined,
			effectiveParams.ipInfo,
			effectiveParams.headers,
			effectiveParams.mode,
			effectiveParams.simdReadings,
			effectiveParams.entropyMathRandomFingerprint,
			effectiveParams.entropyCryptoFingerprint,
			effectiveParams.entropyWallClockOffsetMs,
			effectiveParams.entropyMathRandomFirst,
			effectiveParams.bundleId,
			effectiveParams.currentUrl,
			effectiveParams.tcpToChelloUs,
			effectiveParams.chelloToHandshakeUs,
			undefined,
			effectiveParams.iframeUrl,
			effectiveParams.isProtect,
			undefined,
			effectiveParams.g,
			effectiveParams.matchedRule,
			effectiveParams.i,
			effectiveParams.sw,
			effectiveParams.md,
			effectiveParams.bn,
			effectiveParams.fs,
			{
				synNs: effectiveParams.synNs,
				synackNs: effectiveParams.synackNs,
				ackNs: effectiveParams.ackNs,
				observedTtl: effectiveParams.observedTtl,
				tcpMss: effectiveParams.tcpMss,
				tcpWscale: effectiveParams.tcpWscale,
				tcpOptsFlags: effectiveParams.tcpOptsFlags,
				tcpOptsOrder: effectiveParams.tcpOptsOrder,
				tcpWindow: effectiveParams.tcpWindow,
			},
			finalPuzzleOverrides,
		);

		// Fire-and-forget served-counter writes. Skipped when there's no
		// routing context (maintenance mode / configured captchaType paths) —
		// counters are only useful when a router is in play, which requires
		// the same context.
		if (this.routingContext && this.usageCounters) {
			this.usageCounters.incrManyAsync(
				this.routingContext.dappAccount,
				buildAllWindowIncrements(
					"served",
					finalCaptchaType,
					this.routingContext.ip,
					this.routingContext.userAccount,
				),
			);
		}

		return {
			[ApiParams.captchaType]: finalCaptchaType,
			[ApiParams.sessionId]: sessionRecord.sessionId,
			[ApiParams.status]: "ok",
			dns_url: buildDnsEventUrl(sessionRecord.sessionId),
		};
	}

	async registerBlockedSession(
		params?: Partial<ImageCaptchaSessionParams>,
	): Promise<void> {
		const effectiveParams = { ...this.sessionParams, ...params };
		if (
			!effectiveParams.token ||
			effectiveParams.score === undefined ||
			effectiveParams.threshold === undefined ||
			!effectiveParams.scoreComponents ||
			!effectiveParams.ipAddress ||
			effectiveParams.siteKey === undefined
		) {
			throw new Error(
				"Session parameters must be set before calling registerBlockedSession",
			);
		}

		await this.createSession(
			effectiveParams.token,
			effectiveParams.score,
			effectiveParams.threshold,
			effectiveParams.scoreComponents,
			effectiveParams.ipAddress,
			CaptchaType.image,
			effectiveParams.siteKey,
			effectiveParams.solvedImagesCount,
			undefined,
			effectiveParams.userSitekeyIpHash,
			effectiveParams.webView ?? false,
			effectiveParams.iFrame ?? false,
			effectiveParams.decryptedHeadHash,
			effectiveParams.reason as FrictionlessReason,
			true,
			true,
			effectiveParams.ipInfo,
			effectiveParams.headers,
			effectiveParams.mode,
			effectiveParams.simdReadings,
			effectiveParams.entropyMathRandomFingerprint,
			effectiveParams.entropyCryptoFingerprint,
			effectiveParams.entropyWallClockOffsetMs,
			effectiveParams.entropyMathRandomFirst,
			effectiveParams.bundleId,
			effectiveParams.currentUrl,
			effectiveParams.tcpToChelloUs,
			effectiveParams.chelloToHandshakeUs,
			undefined,
			effectiveParams.iframeUrl,
			effectiveParams.isProtect,
			undefined,
			effectiveParams.g,
			effectiveParams.matchedRule,
			effectiveParams.i,
			effectiveParams.sw,
			effectiveParams.md,
			effectiveParams.bn,
			effectiveParams.fs,
			{
				synNs: effectiveParams.synNs,
				synackNs: effectiveParams.synackNs,
				ackNs: effectiveParams.ackNs,
				observedTtl: effectiveParams.observedTtl,
				tcpMss: effectiveParams.tcpMss,
				tcpWscale: effectiveParams.tcpWscale,
				tcpOptsFlags: effectiveParams.tcpOptsFlags,
				tcpOptsOrder: effectiveParams.tcpOptsOrder,
				tcpWindow: effectiveParams.tcpWindow,
			},
		);
	}

	scoreIncreaseAccessPolicy(
		accessPolicy: AccessPolicy | undefined,
		baseBotScore: number,
		botScore: number,
		scoreComponents: ScoreComponents,
	): { score: number; scoreComponents: ScoreComponents } {
		const accessPolicyPenalty =
			accessPolicy?.frictionlessScore ||
			this.config.penalties.PENALTY_ACCESS_RULE;
		botScore += accessPolicyPenalty;
		return {
			score: botScore,
			scoreComponents: {
				...scoreComponents,
				accessPolicy: accessPolicyPenalty,
			},
		};
	}

	scoreIncreaseWebView(
		baseBotScore: number,
		botScore: number,
		scoreComponents: ScoreComponents,
	): { score: number; scoreComponents: ScoreComponents } {
		this.logger.debug(() => ({
			msg: "WebView detected",
		}));
		botScore += this.config.penalties.PENALTY_WEBVIEW;
		return {
			score: botScore,
			scoreComponents: {
				...scoreComponents,
				webView: this.config.penalties.PENALTY_WEBVIEW,
			},
		};
	}

	scoreIncreaseTimestamp(
		timestamp: number,
		baseBotScore: number,
		botScore: number,
		scoreComponents: ScoreComponents,
	): { score: number; scoreComponents: ScoreComponents } {
		this.logger.info(() => ({
			msg: "Timestamp is older than 10 minutes",
			data: { timestamp: new Date(timestamp) },
		}));
		botScore += this.config.penalties.PENALTY_OLD_TIMESTAMP;
		return {
			score: botScore,
			scoreComponents: {
				...scoreComponents,
				timeout: this.config.penalties.PENALTY_OLD_TIMESTAMP,
			},
		};
	}

	static timestampTooOld(timestamp: number): boolean {
		const now = Date.now();
		const diff = now - timestamp;
		return diff > DEFAULT_MAX_TIMESTAMP_AGE;
	}

	/**
	 * Redacts a key for logging purposes by showing only the first 5, middle 10, and last 5 characters
	 * @param key - The key to redact
	 * @returns Redacted key string or empty string if key is falsy
	 */
	private redactKeyForLogging(key: string | undefined | null): string {
		if (!key) return "";

		const start = key.slice(0, 5);
		const middle = key.slice(
			Math.floor(key.length / 2) - 5,
			Math.floor(key.length / 2) + 5,
		);
		const end = key.slice(-5);

		return `${start}...${middle}...${end}`;
	}

	/**
	 * Resolve the decrypt attempt for a payload. The detector lives only in the
	 * provider-served pool bundles, so this is a SINGLE deterministic decrypt
	 * with the session's own RSA keypair + inner cipher config, resolved from the
	 * `detectorSessionId → bundleId` Redis binding. There is no legacy key pool:
	 * if the binding can't be resolved (expired/missing) the caller fails closed
	 * (score treated as bot ⇒ PoW). Also returns the resolved bundleId so the
	 * caller can promote it onto the session for the later behavioural/SIMD hops.
	 */
	async resolveDecryptAttempts(detectorSessionId?: string): Promise<{
		attempts: { key: string; innerConfig?: string }[];
		bundleId?: string;
	}> {
		const bundle = await this.resolveBundleByDetectorSession(detectorSessionId);
		if (bundle) {
			return {
				attempts: [{ key: bundle.key, innerConfig: bundle.innerConfig }],
				bundleId: bundle.bundleId,
			};
		}
		return { attempts: [] };
	}

	async decryptPayload(
		token: string,
		headHash: string,
		detectorSessionId?: string,
	) {
		const { attempts: decryptKeys, bundleId } =
			await this.resolveDecryptAttempts(detectorSessionId);

		this.logger.debug(() => {
			return {
				msg: "Decrypting score",
				data: {
					keysLength: decryptKeys.length,
					bundleId,
					usingBundle: bundleId !== undefined,
				},
			};
		});

		// run through the keys and try to decrypt the score
		// if we run out of keys and the score is still not decrypted, throw an error
		let baseBotScore: number | undefined;
		let timestamp: number | undefined;
		let userId: string | undefined;
		let userAgent: string | undefined;
		let webView: boolean | undefined;
		let iFrame: boolean | undefined;
		let decryptedHeadHash = "";
		let decryptionFailed = false;
		let triggeredDetectors: number[] | undefined;
		let shadowDomPenalty: boolean | undefined;
		let entropyMathRandomFingerprint: string | undefined;
		let entropyCryptoFingerprint: string | undefined;
		let entropyWallClockOffsetMs: number | undefined;
		let entropyMathRandomFirst: number | undefined;
		let g: string | undefined;
		let ii: boolean | undefined;
		let cvv: number | undefined;
		let sqq: number | undefined;
		let bb: Record<string, string[]> | undefined;
		let sw: boolean | undefined;
		let md: boolean | undefined;
		let bn: boolean | undefined;
		let fs: boolean | undefined;
		for (const [keyIndex, attempt] of decryptKeys.entries()) {
			try {
				this.logger.info(() => ({
					msg: "Attempting to decrypt score",
					data: {
						key: this.redactKeyForLogging(attempt.key),
					},
				}));
				const decrypted = await getBotScore(
					token,
					headHash,
					attempt.key,
					attempt.innerConfig,
				);
				decryptedHeadHash = decrypted.decryptedHeadHash || "";
				const s = decrypted.baseBotScore;
				const t = decrypted.timestamp;
				const a = decrypted.userId;
				const u = decrypted.userAgent;
				const w = decrypted.isWebView;
				const i = decrypted.isIframe;
				const td = decrypted.triggeredDetectors;
				const sd = decrypted.shadowDomPenalty;
				const ef = decrypted.entropyMathRandomFingerprint;
				const ec = decrypted.entropyCryptoFingerprint;
				const eo = decrypted.entropyWallClockOffsetMs;
				const em = decrypted.entropyMathRandomFirst;
				const gv = decrypted.g;
				const iv = decrypted.i;
				const cvv2 = decrypted.cv;
				const sqq2 = decrypted.sq;
				const bv = decrypted.b;
				const swv = decrypted.sw;
				const mdv = decrypted.md;
				const bnv = decrypted.bn;
				const fsv = decrypted.fs;
				this.logger.debug(() => ({
					msg: "Successfully decrypted score",
					data: {
						key: this.redactKeyForLogging(attempt.key),
						baseBotScore: s,
						timestamp: t,
						userId: a,
						userAgent: u,
						webView: w,
						iFrame: i,
						triggeredDetectors: td,
						shadowDomPenalty: sd,
						entropyMathRandomFingerprint: ef,
						entropyCryptoFingerprint: ec,
						entropyWallClockOffsetMs: eo,
						entropyMathRandomFirst: em,
						sw: swv,
						md: mdv,
						bn: bnv,
						fs: fsv,
					},
				}));
				baseBotScore = s;
				timestamp = t;
				userId = a;
				userAgent = u;
				webView = w;
				iFrame = i;
				triggeredDetectors = td;
				shadowDomPenalty = sd;
				entropyMathRandomFingerprint = ef;
				entropyCryptoFingerprint = ec;
				entropyWallClockOffsetMs = eo;
				entropyMathRandomFirst = em;
				g = gv;
				ii = iv;
				cvv = cvv2;
				sqq = sqq2;
				bb = bv;
				sw = swv;
				md = mdv;
				bn = bnv;
				fs = fsv;
				break;
			} catch (err) {
				// check if the next index exists, if not, log an error
				if (keyIndex === decryptKeys.length - 1) {
					this.logger.warn(() => ({
						msg: "Error decrypting score: no more keys to try",
					}));
					baseBotScore = 1;
					timestamp = 0;
					decryptedHeadHash = "";
					decryptionFailed = true;
				}
			}
		}

		const baseBotScoreUndefined =
			baseBotScore === undefined || Number.isNaN(baseBotScore);
		const timestampUndefined =
			timestamp === undefined || Number.isNaN(timestamp);
		const undefinedCount =
			Number(baseBotScoreUndefined) + Number(timestampUndefined);
		if (undefinedCount > 0) {
			this.logger.error(() => ({
				msg: "Error decrypting score: baseBotScore or timestamp is undefined",
			}));
			baseBotScore = 1;
			timestamp = 0;
			decryptedHeadHash = "";
			decryptionFailed = true;
		}
		this.logger.info(() => ({
			msg: "decryptPayload result",
			data: {
				baseBotScore: baseBotScore,
				timestamp: timestamp,
				userId,
				userAgent,
				webView,
				iFrame,
				decryptedHeadHash,
				decryptionFailed,
				shadowDomPenalty,
				sw,
				md,
				bn,
				fs,
			},
		}));

		// To satisfy TS - see above for undefined checks
		return {
			baseBotScore: Number(baseBotScore),
			timestamp: Number(timestamp),
			userId,
			userAgent,
			webView: webView || false,
			iFrame: iFrame || false,
			decryptedHeadHash,
			decryptionFailed,
			triggeredDetectors,
			shadowDomPenalty,
			entropyMathRandomFingerprint,
			entropyCryptoFingerprint,
			entropyWallClockOffsetMs,
			entropyMathRandomFirst,
			g,
			i: ii,
			cv: cvv,
			sq: sqq,
			b: bb,
			sw,
			md,
			bn,
			fs,
			// The pool bundle used (if any) — promoted onto the session so the
			// later behavioural-data hop can resolve the same keypair/inner cfg.
			bundleId,
		};
	}
}
