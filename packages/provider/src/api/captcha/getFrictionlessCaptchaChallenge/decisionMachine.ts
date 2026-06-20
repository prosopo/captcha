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

import { ProsopoApiError } from "@prosopo/common";
import {
	CaptchaType,
	ContextType,
	type IPInfoResponse,
	type RequestHeaders,
	type ScoreComponents,
} from "@prosopo/types";
import type { ClientRecord } from "@prosopo/types-database";
import type { ProviderEnvironment } from "@prosopo/types-env";
import { compareBinaryStrings } from "@prosopo/util";
import type { NextFunction, Request, Response } from "express";
import type { AugmentedRequest } from "../../../express.js";
import {
	FrictionlessManager,
	FrictionlessReason,
} from "../../../tasks/frictionless/frictionlessTasks.js";
import { timestampDecayFunction } from "../../../tasks/frictionless/frictionlessTasksUtils.js";
import type { Tasks } from "../../../tasks/index.js";
import { hashUserAgent } from "../../../utils/hashUserAgent.js";
import {
	determineContextType,
	getContextThreshold,
} from "../contextAwareValidation.js";
import { getRoundsFromSimScore } from "./constants.js";
import { attachHoneypot } from "./honeypotResponse.js";

export type DecisionMachineInput = {
	tasks: Tasks;
	env: ProviderEnvironment;
	clientRecord: ClientRecord;
	dapp: string;
	user: string;
	userSitekeyIpHash: string;
	flatHeaders: RequestHeaders;
	ipInfo: IPInfoResponse | undefined;
	timestamp: number;
	decryptionFailed: boolean;
	userAgent: string | undefined;
	userId: string | undefined;
	webView: boolean;
	decryptedHeadHash: string;
	providerSelectEntropy: number;
	baseBotScore: number;
	botScore: number;
	scoreComponents: ScoreComponents;
	token: string;
	botThreshold: number;
};

type ExpressHandle = {
	req: Request & AugmentedRequest;
	res: Response;
	next: NextFunction;
};

// Post-validation pipeline: UA → context → webview → timestamp → host →
// score → default-pow. Always terminates the request.
export const runDecisionMachine = async (
	input: DecisionMachineInput,
	handle: ExpressHandle,
): Promise<unknown> => {
	const {
		tasks,
		env,
		clientRecord,
		dapp,
		userSitekeyIpHash,
		flatHeaders,
		ipInfo,
	} = input;
	const { req, res } = handle;
	let { botScore, scoreComponents } = input;

	const userAgentMismatchResponse = await runUserAgentMismatchCheck(
		input,
		handle,
	);
	if (userAgentMismatchResponse) return userAgentMismatchResponse;

	const contextResponse = await runContextAwareValidation(input, handle);
	if (contextResponse) return contextResponse;

	// Accumulate all score penalties before evaluating autoBan so the
	// threshold compares against the full sum.
	const webViewTripped =
		clientRecord.settings.disallowWebView === true && input.webView === true;
	if (webViewTripped) {
		tasks.logger.info(() => ({ msg: "WebView detected" }));
		const scoreUpdate = tasks.frictionlessManager.scoreIncreaseWebView(
			input.baseBotScore,
			botScore,
			scoreComponents,
		);
		botScore = scoreUpdate.score;
		scoreComponents = scoreUpdate.scoreComponents;
		tasks.frictionlessManager.updateScore(botScore, scoreComponents);
	}

	const timestampTripped = FrictionlessManager.timestampTooOld(input.timestamp);
	if (timestampTripped) {
		const scoreUpdate = tasks.frictionlessManager.scoreIncreaseTimestamp(
			input.timestamp,
			input.baseBotScore,
			botScore,
			scoreComponents,
		);
		botScore = scoreUpdate.score;
		scoreComponents = scoreUpdate.scoreComponents;
		tasks.frictionlessManager.updateScore(botScore, scoreComponents);
	}

	const hostVerified = await tasks.frictionlessManager.hostVerified(
		input.providerSelectEntropy,
	);
	if (!hostVerified.verified) {
		const scoreUpdate = tasks.frictionlessManager.scoreIncreaseUnverifiedHost(
			hostVerified.domain,
			input.baseBotScore,
			botScore,
			scoreComponents,
		);
		botScore = scoreUpdate.score;
		scoreComponents = scoreUpdate.scoreComponents;
		tasks.frictionlessManager.updateScore(botScore, scoreComponents);
	}

	const autoBanThreshold = clientRecord.settings.autoBanScoreThreshold;
	if (autoBanThreshold !== undefined && Number(botScore) >= autoBanThreshold) {
		req.logger.info(() => ({
			msg: "Frictionless decision",
			data: {
				requestId: req.requestId,
				decision: "auto_ban_score",
				botScore,
				autoBanThreshold,
				token: input.token,
			},
		}));
		await tasks.frictionlessManager.registerBlockedSession({
			solvedImagesCount: clientRecord.settings.imageMaxRounds,
			userSitekeyIpHash,
			reason: FrictionlessReason.AUTO_BAN_SCORE,
			siteKey: dapp,
			ipInfo,
			headers: flatHeaders,
		});
		return res.status(401).json({ error: "Unauthorized" });
	}

	if (webViewTripped) {
		req.logger.info(() => ({
			msg: "Frictionless decision",
			data: {
				requestId: req.requestId,
				decision: "webview_detected",
				captchaType: CaptchaType.image,
			},
		}));
		attachHoneypot(res, clientRecord);
		return res.json(
			await tasks.frictionlessManager.sendImageCaptcha({
				solvedImagesCount: Math.min(
					env.config.captchas.solved.count * 2,
					clientRecord.settings.imageMaxRounds,
				),
				userSitekeyIpHash,
				reason: FrictionlessReason.WEBVIEW_DETECTED,
				siteKey: dapp,
				ipInfo,
				headers: flatHeaders,
			}),
		);
	}

	if (timestampTripped) {
		req.logger.info(() => ({
			msg: "Frictionless decision",
			data: {
				requestId: req.requestId,
				decision: "timestamp_too_old",
				captchaType: CaptchaType.image,
			},
		}));
		attachHoneypot(res, clientRecord);
		return res.json(
			await tasks.frictionlessManager.sendImageCaptcha({
				solvedImagesCount: timestampDecayFunction(
					input.timestamp,
					input.decryptionFailed,
					clientRecord.settings.imageMaxRounds,
				),
				userSitekeyIpHash,
				reason: FrictionlessReason.OLD_TIMESTAMP,
				siteKey: dapp,
				ipInfo,
				headers: flatHeaders,
			}),
		);
	}

	if (Number(botScore) > input.botThreshold) {
		req.logger.info(() => ({
			msg: "Bot score is greater than threshold",
			data: {
				botScore,
				botThreshold: input.botThreshold,
				token: input.token,
			},
		}));
		req.logger.info(() => ({
			msg: "Frictionless decision",
			data: {
				requestId: req.requestId,
				decision: "bot_score_above_threshold",
				captchaType: CaptchaType.image,
			},
		}));
		attachHoneypot(res, clientRecord);
		return res.json(
			await tasks.frictionlessManager.sendImageCaptcha({
				solvedImagesCount: Math.min(
					env.config.captchas.solved.count,
					clientRecord.settings.imageMaxRounds,
				),
				userSitekeyIpHash,
				reason: FrictionlessReason.BOT_SCORE_ABOVE_THRESHOLD,
				siteKey: dapp,
				ipInfo,
				headers: flatHeaders,
			}),
		);
	}

	req.logger.info(() => ({
		msg: "Frictionless decision",
		data: {
			requestId: req.requestId,
			decision: "default_pow",
			captchaType: CaptchaType.pow,
		},
	}));
	attachHoneypot(res, clientRecord);
	return res.json(
		await tasks.frictionlessManager.sendPowCaptcha({
			userSitekeyIpHash,
			siteKey: dapp,
			ipInfo,
			headers: flatHeaders,
		}),
	);
};

const runUserAgentMismatchCheck = async (
	input: DecisionMachineInput,
	handle: ExpressHandle,
): Promise<Response | null> => {
	const { req, res } = handle;
	const headersUserAgent = req.headers["user-agent"];
	const headersProsopoUser = req.headers["prosopo-user"];
	const hashedHeadersUserAgent = headersUserAgent
		? hashUserAgent(headersUserAgent)
		: "";

	if (
		hashedHeadersUserAgent === input.userAgent &&
		headersProsopoUser === input.userId
	) {
		return null;
	}

	req.logger.info(() => ({
		msg: "User agent or user id does not match",
		data: {
			headersUserAgent,
			hashedHeadersUserAgent,
			userAgent: input.userAgent,
			headersProsopoUser,
			userId: input.userId,
		},
	}));

	req.logger.info(() => ({
		msg: "Frictionless decision",
		data: {
			requestId: req.requestId,
			decision: "user_agent_mismatch",
			captchaType: CaptchaType.image,
		},
	}));
	attachHoneypot(res, input.clientRecord);
	return res.json(
		await input.tasks.frictionlessManager.sendImageCaptcha({
			solvedImagesCount: timestampDecayFunction(
				input.timestamp,
				input.decryptionFailed,
				input.clientRecord.settings.imageMaxRounds,
			),
			userSitekeyIpHash: input.userSitekeyIpHash,
			reason: FrictionlessReason.USER_AGENT_MISMATCH,
			siteKey: input.dapp,
			ipInfo: input.ipInfo,
			headers: input.flatHeaders,
		}),
	);
};

const runContextAwareValidation = async (
	input: DecisionMachineInput,
	handle: ExpressHandle,
): Promise<unknown | null> => {
	const { tasks, clientRecord, dapp, user } = input;
	const { req, res, next } = handle;

	if (!clientRecord.settings.contextAware?.enabled) return null;

	const contexts = clientRecord.settings.contextAware?.contexts || {};
	const hasDefault = contexts[ContextType.Default] !== undefined;
	const hasWebview = contexts[ContextType.Webview] !== undefined;

	let contextType: ContextType | undefined;
	if (hasDefault && hasWebview) {
		contextType = determineContextType(input.webView);
	} else if (hasDefault) {
		contextType = ContextType.Default;
	} else if (hasWebview) {
		contextType = ContextType.Webview;
	}

	if (!contextType) return null;

	const clientEntropy = await tasks.frictionlessManager.getClientContextEntropy(
		clientRecord.account,
		contextType,
	);

	if (!clientEntropy) return null;

	if (!input.decryptedHeadHash) {
		tasks.logger.info(() => ({
			msg: "No decryptedHeadHash in session for context aware client",
		}));
		return next(
			new ProsopoApiError("API.BAD_REQUEST", {
				context: { code: 400, siteKey: dapp, user },
				i18n: req.i18n,
				logger: req.logger,
			}),
		);
	}

	const threshold = getContextThreshold(clientRecord.settings, contextType);
	const sim = compareBinaryStrings(input.decryptedHeadHash, clientEntropy);
	if (sim >= threshold) return null;

	req.logger.info(() => ({
		msg: "Frictionless decision",
		data: {
			requestId: req.requestId,
			decision: "context_aware_failed",
			captchaType: CaptchaType.image,
			sim,
			threshold,
		},
	}));
	attachHoneypot(res, clientRecord);
	return res.json(
		await tasks.frictionlessManager.sendImageCaptcha({
			solvedImagesCount: Math.min(
				getRoundsFromSimScore(sim),
				clientRecord.settings.imageMaxRounds,
			),
			userSitekeyIpHash: input.userSitekeyIpHash,
			reason: FrictionlessReason.CONTEXT_AWARE_VALIDATION_FAILED,
			siteKey: dapp,
			ipInfo: input.ipInfo,
			headers: input.flatHeaders,
		}),
	);
};
