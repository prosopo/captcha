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

export { FrictionlessReason };

export interface ImageCaptchaSessionParams extends Session {}

export interface PowCaptchaSessionParams extends Session {}

export interface PuzzleCaptchaSessionParams extends Session {}

/**
 * Everything a caller supplies when minting a session. `sessionId` and
 * `createdAt` are assigned by `createSession` and `simdReadingsStage` is
 * derived from `simdReadings`, so none of the three are accepted here.
 */
export type CreateSessionInput = Omit<
	Session,
	| "sessionId"
	| "createdAt"
	| "simdReadingsStage"
	| "siteKey"
	| "webView"
	| "iFrame"
	| "decryptedHeadHash"
> &
	// Optional on `Session`, but every issuance path knows its sitekey.
	Required<Pick<Session, "siteKey">> &
	// Required on `Session`; defaulted here for callers with nothing to report.
	Partial<Pick<Session, "webView" | "iFrame" | "decryptedHeadHash">>;

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
	 * Provide the routing-machine context for this request. Not called on
	 * maintenance-mode or configured-captchaType short-circuit paths — those
	 * skip routing entirely.
	 */
	setRoutingContext(ctx: RoutingContext): void {
		this.routingContext = ctx;
	}

	/**
	 * Evaluate the configured routing machine without going through
	 * `sendCaptcha`. Returns the supplied baseline on any failure (no machine,
	 * machine throws, counter fetch failure), matching applyRouter's contract.
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
			b: params.b,
			tcpToChelloUs: params.tcpToChelloUs,
			chelloToHandshakeUs: params.chelloToHandshakeUs,
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
	 * Record the access rule that matched this request. Set separately from
	 * `setSessionParams`, which runs before rules are evaluated.
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

	async createSession(input: CreateSessionInput): Promise<Session> {
		// Destructured rather than spread: this list is the set of fields a
		// session record is built from, so anything else on `input` is ignored
		// exactly as it was when these were positional parameters.
		const {
			token,
			score,
			threshold,
			scoreComponents,
			ipAddress,
			captchaType,
			siteKey,
			mode,
			solvedImagesCount,
			powDifficulty,
			userSitekeyIpHash,
			reason,
			blocked,
			deleted,
			ipInfo,
			headers,
			bundleId,
			currentUrl,
			iframeUrl,
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
			synNs,
			synackNs,
			ackNs,
			observedTtl,
			tcpMss,
			tcpWscale,
			tcpOptsFlags,
			tcpOptsOrder,
			tcpWindow,
			simdReadings,
			puzzleTolerance,
			puzzle,
			isEscalation,
			originSessionId,
			isProtect,
			matchedRule,
			webView = false,
			iFrame = false,
			decryptedHeadHash = "",
		} = input;

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
			...(puzzleTolerance !== undefined && { puzzleTolerance }),
			...(puzzle && { puzzle }),
			userSitekeyIpHash,
			webView,
			iFrame,
			...(isEscalation && { isEscalation: true }),
			...(originSessionId && { originSessionId }),
			decryptedHeadHash,
			bundleId,
			reason,
			siteKey,
			currentUrl,
			iframeUrl,
			// Persisted only when true so the sparse index on
			// {isProtect, createdAt} carries only the Protect subset.
			...(isProtect && { isProtect: true }),
			blocked,
			deleted,
			ipInfo,
			headers,
			simdReadings,
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
			synNs,
			synackNs,
			ackNs,
			observedTtl,
			tcpMss,
			tcpWscale,
			tcpOptsFlags,
			tcpOptsOrder,
			tcpWindow,
			...(matchedRule && { matchedRule }),
		};

		await this.db.storeSessionRecord(sessionRecord);

		// Awaited (not fire-and-forget): the next request from this client
		// consumes the session and `await`s its Redis invalidation. A cache
		// write landing after that invalidation would leave the stale entry
		// resolving to a Mongo-deleted row for the rest of the TTL.
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
	 * Issuance path for Web Bot Auth verified requests: the signature
	 * verification already carried the trust decision, so there is no captcha
	 * to solve, no bot score to compute and no routing to run. Consumed only by
	 * `/client/authenticated/verify`.
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
			// Zeroed so downstream analytics never mistake this for a scored
			// session.
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
			// Written rather than left absent so single-use enforcement can
			// tell "never set" apart from "consumed".
			serverChecked: false,
			agent: true,
			webBotAuthAgent,
			...(ipInfo && { ipInfo }),
			...(headers && { headers }),
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
	 * Verify an authenticated (Web Bot Auth) session, called from
	 * `/client/authenticated/verify` after the operator forwards their
	 * dApp-signed token. Marks serverChecked=true on success so subsequent
	 * verifies fail loudly.
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
		// Shared helper so the authenticated flow can't drift from the other
		// captcha types: a site that doesn't opt in to correlation is a no-op,
		// anything else — including "supplied but nothing recorded" — is a
		// mismatch.
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

		// Resolved before the session is written, and after the router, so it is
		// the last word on captchaType. A session minted as a type we cannot
		// fulfil strands the user on INCORRECT_CAPTCHA_TYPE, since the
		// serve-time endpoints cannot substitute another type.
		const finalCaptchaType = coerceToEnabledCaptchaType(
			routed.captchaType,
			this.routingContext?.frictionlessTypes,
			this.logger,
		);
		// The routing-machine output schema only bounds the count as a positive
		// int, so clamp it to the sitekey's rounds here as every other sizing
		// path does. `effectiveParams` is already clamped by its caller.
		const requestedSolvedImagesCount =
			routed.solvedImagesCount ?? effectiveParams.solvedImagesCount;
		// Falls back to the schema defaults rather than skipping the clamp if
		// the bounds ever go missing: an unbounded round count is the worse
		// failure.
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
		// score ladder left on the session params. Resolved here rather than
		// beside its use on the session record below, because the puzzle
		// overrides need it to tell an escalation from a missing measurement.
		const finalReason =
			(routed.reason as FrictionlessReason | undefined) ??
			(effectiveParams.reason as FrictionlessReason | undefined);
		// Puzzle tunables persisted on the session so getPuzzleCaptchaChallenge
		// can layer them over the site defaults — that endpoint re-derives its
		// overrides from a live trafficFilter verdict, and a router- or
		// severity-chosen puzzle has no verdict to re-derive from. Two sources,
		// in precedence order: the difficulty ladder derived from the requested
		// round count, then explicit router overrides, which win.
		const finalPuzzleOverrides: Pick<Session, "puzzleTolerance" | "puzzle"> =
			finalCaptchaType === CaptchaType.puzzle
				? (() => {
						// The site's own ceiling on automatic escalation; 0 pins the
						// level to 0 so its configured puzzle settings render every time.
						const maxLevel =
							this.routingContext?.puzzleMaxDifficulty ??
							puzzleMaxDifficultyDefault;
						// Paths that measured nothing carry a fixed fallback round count,
						// not a severity, so they must not read as an escalation.
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
						// Level 0 means nothing escalated this session: leave the session
						// bare so getPuzzleCaptchaChallenge falls back to the site's own
						// configured settings rather than ladder values.
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

		const sessionRecord = await this.createSession({
			...effectiveParams,
			// Restated because the guard above narrows these on
			// `effectiveParams`, and a spread would widen them back.
			token: effectiveParams.token,
			score: effectiveParams.score,
			threshold: effectiveParams.threshold,
			scoreComponents: effectiveParams.scoreComponents,
			ipAddress: effectiveParams.ipAddress,
			siteKey: effectiveParams.siteKey,
			captchaType: finalCaptchaType,
			solvedImagesCount: finalSolvedImagesCount,
			powDifficulty: finalPowDifficulty,
			reason: finalReason,
			blocked,
			puzzleTolerance: finalPuzzleOverrides.puzzleTolerance,
			puzzle: finalPuzzleOverrides.puzzle,
			// Never set on this path; pinned so a stale value on
			// `effectiveParams` can't reach the record through the spread.
			deleted: undefined,
			isEscalation: undefined,
			originSessionId: undefined,
		});

		// Fire-and-forget served-counter writes, only useful when a router is in
		// play.
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

		await this.createSession({
			...effectiveParams,
			token: effectiveParams.token,
			score: effectiveParams.score,
			threshold: effectiveParams.threshold,
			scoreComponents: effectiveParams.scoreComponents,
			ipAddress: effectiveParams.ipAddress,
			siteKey: effectiveParams.siteKey,
			captchaType: CaptchaType.image,
			powDifficulty: undefined,
			blocked: true,
			deleted: true,
			puzzleTolerance: undefined,
			puzzle: undefined,
			isEscalation: undefined,
			originSessionId: undefined,
		});
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
	 * A single deterministic decrypt with the session's own RSA keypair + inner
	 * cipher config, resolved from the `detectorSessionId → bundleId` Redis
	 * binding. There is no legacy key pool: if the binding can't be resolved the
	 * caller fails closed (score treated as bot ⇒ PoW).
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
				bb = bv;
				sw = swv;
				md = mdv;
				bn = bnv;
				fs = fsv;
				break;
			} catch (err) {
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
			b: bb,
			sw,
			md,
			bn,
			fs,
			// Promoted onto the session so the later behavioural-data hop can
			// resolve the same keypair/inner cfg.
			bundleId,
		};
	}
}
