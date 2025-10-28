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

import type { Logger } from "@prosopo/common";
import { getRandomActiveProvider } from "@prosopo/load-balancer";
import {
	ApiParams,
	CaptchaType,
	type GetFrictionlessCaptchaResponse,
	type KeyringPair,
	type ProsopoConfigOutput,
} from "@prosopo/types";
import type {
	CompositeIpAddress,
	IProviderDatabase,
	ScoreComponents,
	Session,
} from "@prosopo/types-database";
import type { AccessPolicy } from "@prosopo/user-access-policy";
import { v4 as uuidv4 } from "uuid";
import { checkLangRules } from "../../rules/lang.js";
import { CaptchaManager } from "../captchaManager.js";
import { getBotScore } from "../detection/getBotScore.js";

const getDefaultEntropy = (): number => {
	if (process.env.PROSOPO_ENTROPY) {
		const parsed = Number.parseInt(process.env.PROSOPO_ENTROPY);
		if (!Number.isNaN(parsed)) {
			return parsed;
		}
		// ignore invalid value and return default
	}
	return 13337;
};
const DEFAULT_MAX_TIMESTAMP_AGE = 60 * 10 * 1000; // 10 minutes
export const DEFAULT_ENTROPY = getDefaultEntropy();

export interface SessionParams {
	token: string;
	score: number;
	threshold: number;
	scoreComponents: ScoreComponents;
	providerSelectEntropy: number;
	ipAddress: CompositeIpAddress;
	webView?: boolean;
	iFrame?: boolean;
}

export interface ImageCaptchaSessionParams extends SessionParams {
	solvedImagesCount?: number;
}

export interface PowCaptchaSessionParams extends SessionParams {
	powDifficulty?: number;
}

export class FrictionlessManager extends CaptchaManager {
	config: ProsopoConfigOutput;
	private sessionParams?: {
		token: string;
		score: number;
		threshold: number;
		scoreComponents: ScoreComponents;
		providerSelectEntropy: number;
		ipAddress: CompositeIpAddress;
		webView: boolean;
		iFrame: boolean;
	};

	constructor(
		db: IProviderDatabase,
		pair: KeyringPair,
		config: ProsopoConfigOutput,
		logger?: Logger,
	) {
		super(db, pair, logger);
		this.config = config;
	}

	setSessionParams(params: SessionParams): void {
		this.sessionParams = {
			token: params.token,
			score: params.score,
			threshold: params.threshold,
			scoreComponents: params.scoreComponents,
			providerSelectEntropy: params.providerSelectEntropy,
			ipAddress: params.ipAddress,
			webView: params.webView ?? false,
			iFrame: params.iFrame ?? false,
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
		providerSelectEntropy: number,
		ipAddress: CompositeIpAddress,
		captchaType: CaptchaType,
		solvedImagesCount?: number,
		powDifficulty?: number,
		webView = false,
		iFrame = false,
	): Promise<Session> {
		const sessionRecord: Session = {
			sessionId: uuidv4(),
			createdAt: new Date(),
			token,
			score,
			threshold,
			scoreComponents,
			providerSelectEntropy,
			ipAddress,
			captchaType,
			solvedImagesCount,
			powDifficulty,
			webView,
			iFrame,
		};

		await this.db.storeSessionRecord(sessionRecord);
		return sessionRecord;
	}

	async hostVerified(entropy: number) {
		const chosen = await getRandomActiveProvider(
			this.config.defaultEnvironment,
			entropy,
		);

		const domain = new URL(chosen.provider.url).hostname;
		this.logger.info(() => ({
			data: { entropy, host: this.config.host, domain },
		}));

		if (domain !== this.config.host) {
			this.logger.info(() => ({
				msg: "Host mismatch",
				data: { expected: this.config.host, got: domain, entropy },
			}));
			return { verified: false, domain };
		}

		return { verified: true, domain };
	}

	async sendImageCaptcha(
		params?: Partial<ImageCaptchaSessionParams>,
	): Promise<GetFrictionlessCaptchaResponse> {
		const effectiveParams = { ...this.sessionParams, ...params };
		if (
			!effectiveParams.token ||
			effectiveParams.score === undefined ||
			effectiveParams.threshold === undefined ||
			!effectiveParams.scoreComponents ||
			effectiveParams.providerSelectEntropy === undefined ||
			!effectiveParams.ipAddress
		) {
			throw new Error(
				"Session parameters must be set before calling sendImageCaptcha",
			);
		}

		const sessionRecord = await this.createSession(
			effectiveParams.token,
			effectiveParams.score,
			effectiveParams.threshold,
			effectiveParams.scoreComponents,
			effectiveParams.providerSelectEntropy,
			effectiveParams.ipAddress,
			CaptchaType.image,
			params?.solvedImagesCount,
			undefined,
			effectiveParams.webView ?? false,
			effectiveParams.iFrame ?? false,
		);
		return {
			[ApiParams.captchaType]: CaptchaType.image,
			[ApiParams.sessionId]: sessionRecord.sessionId,
			[ApiParams.status]: "ok",
		};
	}

	async sendPowCaptcha(
		params?: Partial<PowCaptchaSessionParams>,
	): Promise<GetFrictionlessCaptchaResponse> {
		const effectiveParams = { ...this.sessionParams, ...params };
		if (
			!effectiveParams.token ||
			effectiveParams.score === undefined ||
			effectiveParams.threshold === undefined ||
			!effectiveParams.scoreComponents ||
			effectiveParams.providerSelectEntropy === undefined ||
			!effectiveParams.ipAddress
		) {
			throw new Error(
				"Session parameters must be set before calling sendPowCaptcha",
			);
		}

		const sessionRecord = await this.createSession(
			effectiveParams.token,
			effectiveParams.score,
			effectiveParams.threshold,
			effectiveParams.scoreComponents,
			effectiveParams.providerSelectEntropy,
			effectiveParams.ipAddress,
			CaptchaType.pow,
			undefined,
			params?.powDifficulty,
			effectiveParams.webView ?? false,
			effectiveParams.iFrame ?? false,
		);
		return {
			[ApiParams.captchaType]: CaptchaType.pow,
			[ApiParams.sessionId]: sessionRecord.sessionId,
			[ApiParams.status]: "ok",
		};
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

	scoreIncreaseUnverifiedHost(
		host: string,
		baseBotScore: number,
		botScore: number,
		scoreComponents: ScoreComponents,
	): { score: number; scoreComponents: ScoreComponents } {
		this.logger.info(() => ({
			msg: "Host not verified",
			data: { requested: this.config.host, selected: host },
		}));
		botScore += this.config.penalties.PENALTY_UNVERIFIED_HOST;
		return {
			score: botScore,
			scoreComponents: {
				...scoreComponents,
				unverifiedHost: this.config.penalties.PENALTY_UNVERIFIED_HOST,
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

	async decryptPayload(token: string) {
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
		let providerSelectEntropy: number | undefined;
		let userId: string | undefined;
		let userAgent: string | undefined;
		let webView: boolean | undefined;
		let iFrame: boolean | undefined;
		for (const [keyIndex, key] of decryptKeys.entries()) {
			try {
				this.logger.info(() => ({
					msg: "Attempting to decrypt score",
					data: {
						key: this.redactKeyForLogging(key),
					},
				}));
				const decrypted = await getBotScore(token, key as string);
				const s = decrypted.baseBotScore;
				const t = decrypted.timestamp;
				const p = decrypted.providerSelectEntropy;
				const a = decrypted.userId;
				const u = decrypted.userAgent;
				const w = decrypted.isWebView;
				const i = decrypted.isIframe;
				this.logger.debug(() => ({
					msg: "Successfully decrypted score",
					data: {
						key: this.redactKeyForLogging(key),
						baseBotScore: s,
						timestamp: t,
						entropy: p,
						userId: a,
						userAgent: u,
						webView: w,
						iFrame: i,
					},
				}));
				baseBotScore = s;
				timestamp = t;
				providerSelectEntropy = p;
				userId = a;
				userAgent = u;
				webView = w;
				iFrame = i;
				break;
			} catch (err) {
				// check if the next index exists, if not, log an error
				if (keyIndex === decryptKeys.length - 1) {
					this.logger.warn(() => ({
						msg: "Error decrypting score: no more keys to try",
					}));
					baseBotScore = 1;
					timestamp = 0;
					providerSelectEntropy = DEFAULT_ENTROPY + 1;
				}
			}
		}

		const baseBotScoreUndefined = baseBotScore === undefined;
		const timestampUndefined = timestamp === undefined;
		const providerSelectEntropyUndefined = providerSelectEntropy === undefined;
		const undefinedCount =
			Number(baseBotScoreUndefined) +
			Number(timestampUndefined) +
			Number(providerSelectEntropyUndefined);
		if (undefinedCount > 0) {
			this.logger.error(() => ({
				msg: "Error decrypting score: baseBotScore or timestamp or providerSelectEntropy is undefined",
			}));
			baseBotScore = 1;
			timestamp = 0;
			providerSelectEntropy = DEFAULT_ENTROPY - undefinedCount;
		}
		this.logger.info(() => ({
			msg: "decryptPayload result",
			data: {
				baseBotScore: baseBotScore,
				timestamp: timestamp,
				entropy: providerSelectEntropy,
				userId,
				userAgent,
				webView,
				iFrame,
			},
		}));

		// To satisfy TS - see above for undefined checks
		return {
			baseBotScore: Number(baseBotScore),
			timestamp: Number(timestamp),
			providerSelectEntropy: Number(providerSelectEntropy),
			userId,
			userAgent,
			webView,
			iFrame,
		};
	}
}
