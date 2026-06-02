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
	type ModeEnum,
	type RequestHeaders,
	type ScoreComponents,
} from "@prosopo/types";
import type { ClientRecord } from "@prosopo/types-database";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { Response } from "express";
import type { getCompositeIpAddress } from "../../../compositeIpAddress.js";
import type { Tasks } from "../../../tasks/index.js";
import { DEFAULT_FRICTIONLESS_THRESHOLD } from "./constants.js";
import { attachHoneypot } from "./honeypotResponse.js";

export type ShortCircuitInput = {
	tasks: Tasks;
	env: ProviderEnvironment;
	clientRecord: ClientRecord;
	token: string;
	dapp: string;
	ipAddress: ReturnType<typeof getCompositeIpAddress>;
	ipInfo: IPInfoResponse | undefined;
	flatHeaders: RequestHeaders;
	sessionMode: ModeEnum | undefined;
	userSitekeyIpHash: string;
	requestId: string | undefined;
	logger: Logger;
};

// Bypasses the bot-detection decision machine when the sitekey is configured
// for a concrete captcha type. Returns null for fully-frictionless sitekeys.
export const runConfiguredCaptchaTypeShortCircuit = async (
	input: ShortCircuitInput,
	res: Response,
): Promise<Response | null> => {
	const configuredType = input.clientRecord.settings?.captchaType;
	if (!configuredType || configuredType === CaptchaType.frictionless) {
		return null;
	}

	const sessionParams = {
		token: input.token,
		score: 0,
		threshold:
			input.clientRecord.settings?.frictionlessThreshold ??
			DEFAULT_FRICTIONLESS_THRESHOLD,
		scoreComponents: { baseScore: 0 } as ScoreComponents,
		providerSelectEntropy: 0,
		ipAddress: input.ipAddress,
		webView: false,
		iFrame: false,
		decryptedHeadHash: "",
		siteKey: input.dapp,
		ipInfo: input.ipInfo,
		headers: input.flatHeaders,
		mode: input.sessionMode,
		userSitekeyIpHash: input.userSitekeyIpHash,
	};

	input.logger.info(() => ({
		msg: "Frictionless decision",
		data: {
			requestId: input.requestId,
			decision: "configured_captcha_type",
			captchaType: configuredType,
		},
	}));

	switch (configuredType) {
		case CaptchaType.image:
			return res.json(
				attachHoneypot(
					await input.tasks.frictionlessManager.sendImageCaptcha({
						...sessionParams,
						solvedImagesCount: Math.min(
							input.env.config.captchas.solved.count,
							input.clientRecord.settings.imageMaxRounds,
						),
					}),
					input.clientRecord,
				),
			);
		case CaptchaType.pow:
			return res.json(
				attachHoneypot(
					await input.tasks.frictionlessManager.sendPowCaptcha(sessionParams),
					input.clientRecord,
				),
			);
		case CaptchaType.puzzle:
			return res.json(
				attachHoneypot(
					await input.tasks.frictionlessManager.sendPuzzleCaptcha(sessionParams),
					input.clientRecord,
				),
			);
		default:
			throw new Error(
				`Unhandled configured captchaType in /frictionless short-circuit: ${configuredType}`,
			);
	}
};
