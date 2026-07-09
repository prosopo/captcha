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

import type { Logger } from "@prosopo/logger";
import {
	ApiParams,
	CaptchaType,
	type CompositeIpAddress,
	type ContextType,
	FrictionlessReason,
	type GetFrictionlessCaptchaResponse,
	type IPInfoResponse,
	type KeyringPair,
	type ModeEnum,
	type ProsopoConfigOutput,
	type RequestHeaders,
	type RoutingMachineBaseline,
	type RoutingMachineOutput,
	type ScoreComponents,
	type Session,
	SimdReadingsStage,
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
import { CaptchaManager } from "../captchaManager.js";
import { DecisionMachineRunner } from "../decisionMachine/decisionMachineRunner.js";
import { getBotScore } from "../detection/getBotScore.js";
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
			siteKey: params.siteKey,
			currentUrl: params.currentUrl,
			ipInfo: params.ipInfo,
			headers: params.headers,
			mode: params.mode,
			simdReadings: params.simdReadings,
			entropyMathRandomFingerprint: params.entropyMathRandomFingerprint,
			entropyCryptoFingerprint: params.entropyCryptoFingerprint,
			entropyWallClockOffsetMs: params.entropyWallClockOffsetMs,
			entropyMathRandomFirst: params.entropyMathRandomFirst,
			tcpToChelloUs: params.tcpToChelloUs,
			chelloToHandshakeUs: params.chelloToHandshakeUs,
		};
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
		currentUrl?: Session["currentUrl"],
		tcpToChelloUs?: Session["tcpToChelloUs"],
		chelloToHandshakeUs?: Session["chelloToHandshakeUs"],
		isEscalation?: Session["isEscalation"],
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
			userSitekeyIpHash,
			webView,
			iFrame,
			// Only persist the escalation flag when it's actually true —
			// avoids polluting analytics with `false` on every plain
			// frictionless session.
			...(isEscalation && { isEscalation: true }),
			decryptedHeadHash,
			reason,
			siteKey,
			currentUrl,
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
			tcpToChelloUs,
			chelloToHandshakeUs,
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
		const routed = this.routingContext
			? await applyRouter(
					this.decisionMachineRunner,
					this.usageCounters,
					baseline,
					this.routingContext,
					this.logger,
				)
			: baseline;

		const finalCaptchaType = routed.captchaType;
		const finalSolvedImagesCount =
			finalCaptchaType === CaptchaType.image
				? (routed.solvedImagesCount ?? effectiveParams.solvedImagesCount)
				: undefined;
		const finalPowDifficulty =
			finalCaptchaType === CaptchaType.pow
				? (routed.powDifficulty ?? effectiveParams.powDifficulty)
				: undefined;
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
			effectiveParams.reason as FrictionlessReason | undefined,
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
			effectiveParams.currentUrl,
			effectiveParams.tcpToChelloUs,
			effectiveParams.chelloToHandshakeUs,
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
			effectiveParams.currentUrl,
			effectiveParams.tcpToChelloUs,
			effectiveParams.chelloToHandshakeUs,
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

	async decryptPayload(token: string, headHash: string) {
		const decryptKeys = [
			// Process DB keys first, then env var key last as env key will likely be invalid
			...(await this.getDetectorKeys()),
			process.env.BOT_DECRYPTION_KEY,
		].filter((k) => k);

		this.logger.debug(() => {
			const loggedKeys = decryptKeys.map((key) =>
				this.redactKeyForLogging(key),
			);

			return {
				msg: "Decrypting score",
				data: {
					keysLength: decryptKeys.length,
					keys: loggedKeys,
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
		for (const [keyIndex, key] of decryptKeys.entries()) {
			try {
				this.logger.info(() => ({
					msg: "Attempting to decrypt score",
					data: {
						key: this.redactKeyForLogging(key),
					},
				}));
				const decrypted = await getBotScore(token, headHash, key as string);
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
				this.logger.debug(() => ({
					msg: "Successfully decrypted score",
					data: {
						key: this.redactKeyForLogging(key),
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
		};
	}

	async getClientContextEntropy(
		siteKey: string,
		contextType: ContextType,
	): Promise<string | undefined> {
		return this.db.getClientContextEntropy(siteKey, contextType);
	}
}
