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
	CaptchaType,
	type IPInfoResponse,
	type RequestHeaders,
	type ScoreComponents,
} from "@prosopo/types";
import type { ClientRecord } from "@prosopo/types-database";
import type { AccessPolicy, UserScope } from "@prosopo/user-access-policy";
import type { Response } from "express";
import { FrictionlessReason } from "../../../tasks/frictionless/frictionlessTasks.js";
import type { Tasks } from "../../../tasks/index.js";
import { attachHoneypot } from "./honeypotResponse.js";

export type AccessPolicyInput = {
	tasks: Tasks;
	clientRecord: ClientRecord;
	userAccessPolicy: AccessPolicy | undefined;
	baseBotScore: number;
	botScore: number;
	scoreComponents: ScoreComponents;
	userSitekeyIpHash: string;
	dapp: string;
	ipInfo: IPInfoResponse | undefined;
	flatHeaders: RequestHeaders;
	logger: Logger;
	userScope: UserScope;
};

// `handled: false` carries the (possibly score-adjusted) state forward so
// the caller's later checks don't lose the score bump from the policy match.
export type AccessPolicyOutcome =
	| { handled: true; response: Response }
	| {
			handled: false;
			botScore: number;
			scoreComponents: ScoreComponents;
	  };

export const handleAccessPolicy = async (
	input: AccessPolicyInput,
	res: Response,
): Promise<AccessPolicyOutcome> => {
	if (!input.userAccessPolicy) {
		return {
			handled: false,
			botScore: input.botScore,
			scoreComponents: input.scoreComponents,
		};
	}

	const { tasks, clientRecord, userAccessPolicy, logger } = input;

	logger.info(() => ({
		msg: "User access policy matched",
		data: {
			policy: userAccessPolicy,
			captchaType: userAccessPolicy.captchaType,
			userScope: input.userScope,
		},
	}));

	const scoreUpdate = tasks.frictionlessManager.scoreIncreaseAccessPolicy(
		userAccessPolicy,
		input.baseBotScore,
		input.botScore,
		input.scoreComponents,
	);
	const botScore = scoreUpdate.score;
	const scoreComponents = scoreUpdate.scoreComponents;
	tasks.frictionlessManager.updateScore(botScore, scoreComponents);

	if (userAccessPolicy.type === "block") {
		logger.info(() => ({
			msg: "Frictionless decision",
			data: {
				decision: "block",
				captchaType: CaptchaType.image,
			},
		}));
		await tasks.frictionlessManager.registerBlockedSession({
			solvedImagesCount: clientRecord.settings.imageMaxRounds,
			userSitekeyIpHash: input.userSitekeyIpHash,
			reason: FrictionlessReason.ACCESS_POLICY_BLOCK,
			siteKey: input.dapp,
			ipInfo: input.ipInfo,
			headers: input.flatHeaders,
		});

		return {
			handled: true,
			response: res.status(401).json({ error: "Unauthorized" }),
		};
	}

	// Defensive: re-evaluate autoBan after the access-policy bump so the
	// non-block branches below can't dispatch to image/pow/puzzle when
	// the bumped score now meets the threshold. The autoBan check added
	// to runDecisionMachine (#2738) doesn't cover this path because
	// handleAccessPolicy short-circuits before runDecisionMachine runs.
	const autoBanThreshold = clientRecord.settings.autoBanScoreThreshold;
	if (autoBanThreshold !== undefined && Number(botScore) >= autoBanThreshold) {
		logger.info(() => ({
			msg: "Frictionless decision",
			data: {
				decision: "auto_ban_score",
				botScore,
				autoBanThreshold,
				captchaType: userAccessPolicy.captchaType,
			},
		}));
		await tasks.frictionlessManager.registerBlockedSession({
			solvedImagesCount: clientRecord.settings.imageMaxRounds,
			userSitekeyIpHash: input.userSitekeyIpHash,
			reason: FrictionlessReason.AUTO_BAN_SCORE,
			siteKey: input.dapp,
			ipInfo: input.ipInfo,
			headers: input.flatHeaders,
		});
		return {
			handled: true,
			response: res.status(401).json({ error: "Unauthorized" }),
		};
	}

	const captchaTypeBaseParams = {
		userSitekeyIpHash: input.userSitekeyIpHash,
		reason: FrictionlessReason.USER_ACCESS_POLICY,
		siteKey: input.dapp,
		ipInfo: input.ipInfo,
		headers: input.flatHeaders,
	};

	if (userAccessPolicy.captchaType === CaptchaType.image) {
		logger.info(() => ({
			msg: "Frictionless decision",
			data: {
				decision: "user_access_policy",
				captchaType: CaptchaType.image,
			},
		}));
		attachHoneypot(res, clientRecord);
		return {
			handled: true,
			response: res.json(
				await tasks.frictionlessManager.sendImageCaptcha({
					...captchaTypeBaseParams,
					solvedImagesCount: userAccessPolicy.solvedImagesCount
						? Math.min(
								userAccessPolicy.solvedImagesCount,
								clientRecord.settings.imageMaxRounds,
							)
						: clientRecord.settings.imageMaxRounds,
				}),
			),
		};
	}

	if (userAccessPolicy.captchaType === CaptchaType.pow) {
		logger.info(() => ({
			msg: "Frictionless decision",
			data: {
				decision: "user_access_policy",
				captchaType: CaptchaType.pow,
			},
		}));
		attachHoneypot(res, clientRecord);
		return {
			handled: true,
			response: res.json(
				await tasks.frictionlessManager.sendPowCaptcha(captchaTypeBaseParams),
			),
		};
	}

	if (userAccessPolicy.captchaType === CaptchaType.puzzle) {
		logger.info(() => ({
			msg: "Frictionless decision",
			data: {
				decision: "user_access_policy",
				captchaType: CaptchaType.puzzle,
			},
		}));
		attachHoneypot(res, clientRecord);
		return {
			handled: true,
			response: res.json(
				await tasks.frictionlessManager.sendPuzzleCaptcha(
					captchaTypeBaseParams,
				),
			),
		};
	}

	return { handled: false, botScore, scoreComponents };
};
